import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { PageAudit, AIContentAnalysis, AIContentFix } from '@/lib/seo-types';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const RATE_LIMIT = { routeId: 'analyze', max: 5, windowMs: 60_000 };

// Максимально короткий промпт для скорости
const SYSTEM_PROMPT = `Ты SEO-аналитик. Верни ТОЛЬКО валидный JSON без markdown. Схема:
{"intent":{"detected":"строка","matchScore":0,"gaps":[]},"contentScore":0,"summary":"1 предложение","fixes":[{"type":"title","title":"","after":"текст","rationale":"","impact":0,"effort":"low"}]}
type: title|description|headings|faq_schema|intent
Верни 3 правки.`;

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const page: PageAudit = body?.page;
    if (!page || !page.url) {
      return NextResponse.json({ error: 'page object is required' }, { status: 400 });
    }

    // Минимальный контекст для AI — только самое важное
    const contextForAI = {
      url: page.url,
      title: page.meta.title || '(нет title)',
      desc: page.meta.description || '(нет description)',
      h1: page.headings.find(h => h.level === 1)?.text || '(нет H1)',
      words: page.wordCount,
      text: (page.contentTextSample || '').slice(0, 800),
    };

    let rawContent = '';
    let lastError = '';

    // Retry: 2 попытки, без долгих задержек
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(contextForAI) },
          ],
          thinking: { type: 'disabled' },
        });
        rawContent = completion.choices[0]?.message?.content || '';
        if (rawContent) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        // Если 429 — ждём 3 сек и повторяем
        if (lastError.includes('429') && attempt < 2) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      }
    }

    if (!rawContent) {
      // AI не ответил — возвращаем fallback, но с ok: true
      // чтобы клиент не показывал ошибку, а использовал fallback данные
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: {
            detected: 'AI временно недоступен — попробуйте позже',
            matchScore: 0,
            gaps: [],
          },
          contentScore: 50,
          summary: 'Тех. аудит завершён. AI-анализ контента не удалось выполнить. Технические результаты и roadmap доступны.',
          fixes: [],
        },
      });
    }

    // Парсим JSON — несколько попыток очистки
    let parsed: AIContentAnalysis | null = null;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Убираем markdown-обёртку
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          // Не удалось распарсить
        }
      }
    }

    if (!parsed) {
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: {
            detected: 'AI вернул некорректный формат',
            matchScore: 0,
            gaps: [],
          },
          contentScore: 50,
          summary: 'Тех. аудит завершён. AI-ответ не удалось обработать.',
          fixes: [],
        },
      });
    }

    // Нормализуем
    const validTypes = ['title', 'description', 'headings', 'content_block', 'faq_schema', 'internal_link', 'intent'] as const;
    const validEfforts = ['low', 'medium', 'high'] as const;

    const analysis: AIContentAnalysis = {
      intent: {
        detected: String(parsed.intent?.detected || 'Не определён'),
        matchScore: Math.max(0, Math.min(100, Number(parsed.intent?.matchScore) || 0)),
        gaps: Array.isArray(parsed.intent?.gaps) ? parsed.intent.gaps.map(String) : [],
      },
      contentScore: Math.max(0, Math.min(100, Number(parsed.contentScore) || 50)),
      summary: String(parsed.summary || ''),
      fixes: Array.isArray(parsed.fixes)
        ? parsed.fixes.map((f: AIContentFix, idx: number) => ({
            type: (validTypes as readonly string[]).includes(f.type) ? f.type : 'content_block',
            title: String(f.title || `Правка ${idx + 1}`),
            before: f.before ? String(f.before) : undefined,
            after: f.after ? String(f.after) : undefined,
            rationale: String(f.rationale || ''),
            impact: Math.max(0, Math.min(100, Number(f.impact) || 50)),
            effort: (validEfforts as readonly string[]).includes(f.effort) ? f.effort : 'medium',
          }))
        : [],
    };

    return NextResponse.json({ ok: true, analysis });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI analysis failed';
    console.error('[/api/analyze] error:', msg);
    // Возвращаем ok: true с fallback — не пугаем пользователя
    return NextResponse.json({
      ok: true,
      analysis: {
        intent: {
          detected: 'AI временно недоступен',
          matchScore: 0,
          gaps: [],
        },
        contentScore: 50,
        summary: 'Тех. аудит завершён. AI-анализ недоступен — результаты ниже.',
        fixes: [],
      },
    });
  }
}

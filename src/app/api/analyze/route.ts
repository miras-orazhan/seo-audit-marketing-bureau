import { NextRequest, NextResponse } from 'next/server';
import type { PageAudit, AIContentAnalysis, AIContentFix } from '@/lib/seo-types';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const RATE_LIMIT = { routeId: 'analyze', max: 5, windowMs: 60_000 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';

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

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(contextForAI) },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        rawContent = data.choices?.[0]?.message?.content || '';
        if (rawContent) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (lastError.includes('429') && attempt < 2) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      }
    }

    if (!rawContent) {
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: { detected: 'AI временно недоступен', matchScore: 0, gaps: [] },
          contentScore: 50,
          summary: 'Тех. аудит завершён. AI-анализ недоступен — результаты ниже.',
          fixes: [],
        },
      });
    }

    // Парсим JSON
    let parsed: AIContentAnalysis | null = null;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    if (!parsed) {
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: { detected: 'AI вернул некорректный формат', matchScore: 0, gaps: [] },
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
    return NextResponse.json({
      ok: true,
      analysis: {
        intent: { detected: 'AI временно недоступен', matchScore: 0, gaps: [] },
        contentScore: 50,
        summary: 'Тех. аудит завершён. AI-анализ недоступен — результаты ниже.',
        fixes: [],
      },
    });
  }
}

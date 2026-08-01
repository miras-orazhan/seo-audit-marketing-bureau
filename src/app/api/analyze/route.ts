import { NextRequest, NextResponse } from 'next/server';
import type { PageAudit, AIContentAnalysis, AIContentFix } from '@/lib/seo-types';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const RATE_LIMIT = { routeId: 'analyze', max: 5, windowMs: 60_000 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';

const SYSTEM_PROMPT = `Ты SEO-аналитик. Объясняй простым языком, без жаргона. Верни ТОЛЬКО валидный JSON. Без markdown, без \`\`\`. Схема:
{"intent":{"detected":"простыми словами для чего эта страница","matchScore":0,"gaps":["что не хватает"]},"contentScore":0,"summary":"1-2 предложения","fixes":[{"type":"title","title":"название","after":"готовый текст","rationale":"почему важно","impact":0,"effort":"low"}]}
type: title|description|headings|faq_schema|intent
Верни 3 правки. Всё на русском.`;

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const page: PageAudit = body?.page;
    if (!page || !page.url) {
      return NextResponse.json({ error: 'page object is required' }, { status: 400 });
    }

    // Если ключ не задан — сразу fallback
    if (!OPENROUTER_API_KEY) {
      console.error('[/api/analyze] OPENROUTER_API_KEY not set');
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: { detected: 'AI не настроен (нет OPENROUTER_API_KEY)', matchScore: 0, gaps: [] },
          contentScore: 50,
          summary: 'Тех. аудит завершён. AI-анализ недоступен — добавьте OPENROUTER_API_KEY в env переменные Vercel.',
          fixes: [],
        },
      });
    }

    const contextForAI = JSON.stringify({
      url: page.url,
      title: page.meta.title || '(нет title)',
      desc: page.meta.description || '(нет description)',
      h1: page.headings.find(h => h.level === 1)?.text || '(нет H1)',
      words: page.wordCount,
      text: (page.contentTextSample || '').slice(0, 800),
    });

    console.log('[/api/analyze] Starting AI request for:', page.url);
    console.log('[/api/analyze] Model:', OPENROUTER_MODEL);
    console.log('[/api/analyze] Context length:', contextForAI.length, 'chars');

    let rawContent = '';
    let lastError = '';

    // 2 попытки
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[/api/analyze] Attempt ${attempt}/${2}...`);

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
              { role: 'user', content: contextForAI },
            ],
            max_tokens: 2000, // Увеличено — модель использует токены на reasoning
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(45000),
        });

        console.log(`[/api/analyze] Response status: ${res.status}`);

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[/api/analyze] HTTP ${res.status}:`, errText.slice(0, 500));
          throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json();
        console.log('[/api/analyze] Usage:', JSON.stringify(data.usage || {}));

        rawContent = data.choices?.[0]?.message?.content || '';

        // gpt-oss может положить ответ в reasoning, а content = null
        if (!rawContent && data.choices?.[0]?.message?.reasoning) {
          console.log('[/api/analyze] Content is null, checking reasoning...');
          rawContent = data.choices[0].message.reasoning;
        }

        console.log('[/api/analyze] Raw content length:', rawContent.length, 'chars');
        console.log('[/api/analyze] Raw content preview:', rawContent.slice(0, 200));

        if (rawContent) {
          console.log('[/api/analyze] Success!');
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[/api/analyze] Attempt ${attempt} failed:`, lastError);

        if (lastError.includes('429') && attempt < 2) {
          console.log('[/api/analyze] Waiting 3s before retry...');
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      }
    }

    if (!rawContent) {
      console.error('[/api/analyze] All attempts failed. Last error:', lastError);
      return NextResponse.json({
        ok: true,
        analysis: {
          intent: { detected: 'AI временно недоступен', matchScore: 0, gaps: [] },
          contentScore: 50,
          summary: 'Тех. аудит завершён. AI не ответил — попробуйте позже.',
          fixes: [],
        },
      });
    }

    // Парсим JSON
    let parsed: AIContentAnalysis | null = null;

    try {
      parsed = JSON.parse(rawContent);
      console.log('[/api/analyze] JSON parsed OK');
    } catch (e1) {
      console.log('[/api/analyze] Direct parse failed, trying cleanup...');

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
          console.log('[/api/analyze] JSON parsed after cleanup');
        } catch (e2) {
          console.error('[/api/analyze] JSON parse failed after cleanup:', String(e2));
        }
      }
    }

    if (!parsed) {
      console.error('[/api/analyze] Could not parse AI response as JSON');
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

    console.log('[/api/analyze] Returning analysis with', analysis.fixes.length, 'fixes');
    return NextResponse.json({ ok: true, analysis });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI analysis failed';
    console.error('[/api/analyze] FATAL error:', msg, e);
    return NextResponse.json({
      ok: true,
      analysis: {
        intent: { detected: 'AI временно недоступен', matchScore: 0, gaps: [] },
        contentScore: 50,
        summary: 'Тех. аудит завершён. AI-анализ недоступен.',
        fixes: [],
      },
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { PageAudit, AIContentAnalysis, AIContentFix } from '@/lib/seo-types';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// 5 AI-анализов в минуту на IP — каждый запрос платный (LLM), режем жёстче.
const RATE_LIMIT = { routeId: 'analyze', max: 5, windowMs: 60_000 };

// Компактный промпт — меньше токенов на входе = быстрее ответ.
const SYSTEM_PROMPT = `SEO-аналитик. Верни СТРОГО валидный JSON (без markdown, без trailing commas). Схема:
{"intent":{"detected":"строка","matchScore":0,"gaps":[]},"contentScore":0,"summary":"1-2 предложения","fixes":[{"type":"title","title":"","before":"","after":"готовый текст","rationale":"","impact":0,"effort":"low"}]}
type: title|description|headings|content_block|faq_schema|internal_link|intent
impact: число 0-100, effort: "low"|"medium"|"high"
Верни 4 правки (title, description, 1 H2/H3 блок, FAQ schema).`;

export async function POST(req: NextRequest) {
  // Rate limit
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
      title: page.meta.title,
      titleLength: page.meta.titleLength,
      description: page.meta.description,
      descriptionLength: page.meta.descriptionLength,
      h1: page.headings.filter((h) => h.level === 1).map((h) => h.text).slice(0, 1),
      h2: page.headings.filter((h) => h.level === 2).map((h) => h.text).slice(0, 3),
      wordCount: page.wordCount,
      // Только 1000 символов — меньше токенов, быстрее ответ
      contentSample: page.contentTextSample.slice(0, 1000),
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        };
        const close = () => {
          if (!closed) {
            closed = true;
            try { controller.close(); } catch { /* already closed */ }
          }
        };

        // Heartbeat каждые 3 сек — именованное SSE-событие, а не комментарий.
        // ALB AWS считает трафиком только полезные данные, не комментарии.
        const heartbeat = setInterval(() => {
          send('heartbeat', { t: Date.now() });
        }, 3000);

        try {
          const zai = await ZAI.create();
          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(contextForAI) },
            ],
            thinking: { type: 'disabled' },
          });

          const rawContent = completion.choices[0]?.message?.content || '';

          // AI иногда возвращает невалидный JSON: trailing commas, unquoted keys,
          // markdown-обёртки. Делаем несколько попыток распарсить, потом fallback.
          let parsed: AIContentAnalysis | null = null;
          let parseError = '';

          // Попытка 1: прямой парсинг
          try {
            parsed = JSON.parse(rawContent);
          } catch (e1) {
            parseError = e1 instanceof Error ? e1.message : String(e1);
            // Попытка 2: вытащить первый {...} блок и распарсить
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch (e2) {
                parseError = e2 instanceof Error ? e2.message : String(e2);
                // Попытка 3: удалить markdown-обёртку и распространённые проблемы
                const cleaned = rawContent
                  .replace(/```json\s*/gi, '')
                  .replace(/```\s*/g, '')
                  .replace(/,\s*}/g, '}')   // trailing comma before }
                  .replace(/,\s*]/g, ']')   // trailing comma before ]
                  .trim();
                const match3 = cleaned.match(/\{[\s\S]*\}/);
                if (match3) {
                  try {
                    parsed = JSON.parse(match3[0]);
                  } catch (e3) {
                    parseError = e3 instanceof Error ? e3.message : String(e3);
                  }
                }
              }
            }
          }

          if (!parsed) {
            // Fallback: возвращаем заглушку с описанием ошибки, чтобы клиент не падал
            console.error('[/api/analyze] all parse attempts failed:', parseError);
            console.error('[/api/analyze] raw AI response (first 1000 chars):', rawContent.slice(0, 1000));
            const fallbackAnalysis: AIContentAnalysis = {
              intent: {
                detected: 'Не удалось определить (AI вернул невалидный JSON)',
                matchScore: 0,
                gaps: [],
              },
              contentScore: 50,
              summary: 'AI-анализ не удался из-за ошибки парсинга ответа. Попробуйте перезапустить аудит или задать вопрос чат-ассистенту.',
              fixes: [],
            };
            clearInterval(heartbeat);
            send('result', { ok: true, analysis: fallbackAnalysis });
            close();
            return;
          }

          const validTypes = ['title', 'description', 'headings', 'content_block', 'faq_schema', 'internal_link', 'intent'] as const;
          const validEfforts = ['low', 'medium', 'high'] as const;

          const analysis: AIContentAnalysis = {
            intent: {
              detected: String(parsed.intent?.detected || 'Не удалось определить'),
              matchScore: Number(parsed.intent?.matchScore) || 0,
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

          clearInterval(heartbeat);
          send('result', { ok: true, analysis });
          close();
        } catch (e: unknown) {
          clearInterval(heartbeat);
          const msg = e instanceof Error ? e.message : 'AI analysis failed';
          console.error('[/api/analyze] error:', msg, e);
          send('result', { ok: false, error: msg });
          close();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI analysis failed';
    console.error('[/api/analyze] outer error:', msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

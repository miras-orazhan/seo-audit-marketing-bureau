import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT = { routeId: 'chat', max: 20, windowMs: 60_000 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';

const SYSTEM_PROMPT = `Ты — встроенный SEO-ассистент в дашборде аудита. Отвечай на русском, кратко и по делу. Если просят переписать текст — давай готовый вариант.`;

interface ChatRequestBody {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  reportSummary: string;
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Контекст отчёта:\n${body.reportSummary}` },
      ...(body.history || []).slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Не удалось сформировать ответ.';
    return NextResponse.json({ reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    console.error('[/api/chat] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT = { routeId: 'chat', max: 20, windowMs: 60_000 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';

const SYSTEM_PROMPT = `Ты — встроенный SEO-ассистент. Отвечай на русском, кратко и по делу. Без SEO-жаргона.`;

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

    if (!OPENROUTER_API_KEY) {
      console.error('[/api/chat] OPENROUTER_API_KEY not set');
      return NextResponse.json({ reply: 'AI не настроен. Добавьте OPENROUTER_API_KEY в env.' });
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

    console.log('[/api/chat] Request for:', message.slice(0, 50));

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });

    console.log('[/api/chat] Response status:', res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[/api/chat] Error:', errText.slice(0, 300));
      throw new Error(`OpenRouter HTTP ${res.status}`);
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content || '';

    // gpt-oss может вернуть null в content
    if (!reply && data.choices?.[0]?.message?.reasoning) {
      reply = data.choices[0].message.reasoning;
    }

    console.log('[/api/chat] Reply length:', reply.length);

    return NextResponse.json({ reply: reply || 'Не удалось сформировать ответ.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    console.error('[/api/chat] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

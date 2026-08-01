import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { geminiChatWithHistory, isGeminiConfigured } from '@/lib/gemini-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT = { routeId: 'chat', max: 20, windowMs: 60_000 };

const SYSTEM_PROMPT = `Ты — встроенный SEO-ассистент в дашборде аудита. Отвечай на русском, кратко и по делу. Если просят переписать текст — давай готовый вариант. Без SEO-жаргона, простыми словами.`;

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

    if (!isGeminiConfigured()) {
      return NextResponse.json({ reply: 'AI не настроен. Добавьте GEMINI_API_KEY в env переменные.' });
    }

    const messages = [
      { role: 'user' as const, content: `Контекст отчёта:\n${body.reportSummary}` },
      { role: 'assistant' as const, content: 'Понял. Готов отвечать по отчёту.' },
      ...(body.history || []).slice(-6).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const reply = await geminiChatWithHistory(SYSTEM_PROMPT, messages, {
      maxTokens: 500,
      temperature: 0.7,
      timeout: 25000,
    });

    return NextResponse.json({ reply: reply || 'Не удалось сформировать ответ.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    console.error('[/api/chat] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

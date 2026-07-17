import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 20 сообщений в минуту на IP — чат дешевле analyze, но тоже режем абьюз.
const RATE_LIMIT = { routeId: 'chat', max: 20, windowMs: 60_000 };

const SYSTEM_PROMPT = `Ты — встроенный SEO-ассистент в дашборде аудита. Пользователь видит отчёт и задаёт вопросы по нему.

Правила:
- Отвечай на русском языке, кратко и по делу.
- Если спрашивают про конкретную проблему — объясни, почему она важна для SEO и как именно её исправить.
- Если просят переписать текст/title/description — давай готовый вариант, который можно скопировать.
- Ссылайся на конкретные пункты из предоставленного контекста отчёта.
- Не выдумывай факты. Если данных недостаточно — честно скажи.`;

interface ChatRequestBody {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  reportSummary: string;
}

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (!body.reportSummary) {
      return NextResponse.json({ error: 'reportSummary is required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    const messages = [
      { role: 'assistant' as const, content: SYSTEM_PROMPT },
      {
        role: 'assistant' as const,
        content: `Контекст текущего отчёта аудита:\n\n${body.reportSummary}\n\nИспользуй эти данные при ответе. Если вопроса нет в отчёте — ответь общими SEO-рекомендациями.`,
      },
      ...(body.history || []).slice(-8).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content || 'Не удалось сформировать ответ.';
    return NextResponse.json({ reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    console.error('[/api/chat] error:', msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

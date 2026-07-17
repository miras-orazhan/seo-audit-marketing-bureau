import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { appendLead, isGoogleSheetsConfigured } from '@/lib/google-sheets';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 5 заявок в минуту на IP — защита от спама
const RATE_LIMIT = { routeId: 'lead', max: 5, windowMs: 60_000 };

// Токен Telegram-бота. В проде вынести в .env: TELEGRAM_BOT_TOKEN
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8775349338:AAG6I6VUuBGdRcZsfkOb36Z3gpRaG2igdqU';
// Chat ID группы/канала, куда слать заявки. В проде вынести в .env: TELEGRAM_CHAT_ID
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5177248944';

interface LeadRequestBody {
  name?: string;
  phone?: string;
  email?: string;
  site?: string;
  message?: string;
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error('[/api/lead] Telegram API error:', data.description);
    }
    return data.ok === true;
  } catch (e) {
    console.error('[/api/lead] sendTelegramMessage failed:', e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as LeadRequestBody;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim();
    const site = body.site?.trim();
    const message = body.message?.trim();

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны' },
        { status: 400 },
      );
    }

    // Формируем текст заявки для Telegram
    const lines: string[] = [
      '<b>🔔 Новая заявка с сайта Marketing Bureau</b>',
      '',
      `<b>Имя:</b> ${escapeHtml(name)}`,
      `<b>Телефон:</b> ${escapeHtml(phone)}`,
    ];
    if (email) lines.push(`<b>Email:</b> ${escapeHtml(email)}`);
    if (site) lines.push(`<b>Сайт:</b> ${escapeHtml(site)}`);
    if (message) lines.push(`<b>Комментарий:</b>\n${escapeHtml(message)}`);
    lines.push('', `<i>Время:</i> ${new Date().toLocaleString('ru-RU')}`);

    const text = lines.join('\n');

    // Отправляем в Telegram (мгновенное уведомление менеджеру)
    const sent = await sendTelegramMessage(TELEGRAM_CHAT_ID, text);
    if (!sent) {
      console.warn('[/api/lead] Telegram отправка не удалась, но продолжаем сохранение в Sheets');
    }

    // Сохраняем в Google Sheets (для аналитики и истории)
    if (isGoogleSheetsConfigured()) {
      const saved = await appendLead({
        date: new Date().toLocaleString('ru-RU'),
        name,
        phone,
        email: email || '',
        site: site || '',
        message: message || '',
      });
      if (!saved) {
        console.warn('[/api/lead] Google Sheets save не удался (но Telegram отправлен)');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Lead submit failed';
    console.error('[/api/lead] error:', msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

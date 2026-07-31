import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/content — возвращает услуги, FAQ, настройки для лендинга
export async function GET() {
  try {
    const [services, faqs, settings] = await Promise.all([
      db.service.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      db.faqItem.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      db.siteSetting.findMany(),
    ]);

    // Преобразуем settings в объект key-value
    const settingsObj: Record<string, string> = {};
    for (const s of settings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json({
      services: services.map(s => ({ title: s.title, description: s.description })),
      faqs: faqs.map(f => ({ q: f.question, a: f.answer })),
      settings: settingsObj,
    });
  } catch (e) {
    console.error('[/api/content] error:', e);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
}

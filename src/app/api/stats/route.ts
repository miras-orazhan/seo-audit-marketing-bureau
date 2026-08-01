import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/stats — статистика для лендинга (кол-во аудитов, лидов)
export async function GET() {
  try {
    const [auditCount, leadCount, uniqueUrls] = await Promise.all([
      db.audit.count(),
      db.lead.count(),
      db.audit.findMany({
        select: { url: true },
        distinct: ['url'],
      }),
    ]);

    return NextResponse.json({
      auditsTotal: auditCount,
      leadsTotal: leadCount,
      uniqueSitesAnalyzed: uniqueUrls.length,
    });
  } catch (e) {
    console.error('[/api/stats] error:', e);
    // Fallback — возвращаем заглушку, чтобы лендинг не падал
    return NextResponse.json({
      auditsTotal: 0,
      leadsTotal: 0,
      uniqueSitesAnalyzed: 0,
    });
  }
}

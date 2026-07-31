import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '../login/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = verifyToken(token);
  if (!email) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const [services, faqs, settings, auditCount, leadCount, uniqueUrls, recentLeads, recentAudits] = await Promise.all([
      db.service.findMany({ orderBy: { order: 'asc' } }),
      db.faqItem.findMany({ orderBy: { order: 'asc' } }),
      db.siteSetting.findMany(),
      db.audit.count(),
      db.lead.count(),
      db.audit.findMany({ select: { url: true }, distinct: ['url'] }),
      db.lead.findMany({ take: 50, orderBy: { createdAt: 'desc' } }),
      db.audit.findMany({ take: 50, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, overallScore: true, createdAt: true } }),
    ]);

    return NextResponse.json({
      services,
      faqs,
      settings,
      stats: { auditsTotal: auditCount, leadsTotal: leadCount, uniqueSitesAnalyzed: uniqueUrls.length },
      recentLeads,
      recentAudits,
    });
  } catch (e) {
    console.error('[/api/admin/data] error:', e);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

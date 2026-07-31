import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { appendAudit, isGoogleSheetsConfigured } from '@/lib/google-sheets';
import { db } from '@/lib/db';
import type { AuditReport } from '@/lib/seo-types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT = { routeId: 'audit-save', max: 10, windowMs: 60_000 };

interface AuditSaveBody {
  report: AuditReport;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as AuditSaveBody;
    if (!body.report || !body.report.targetUrl) {
      return NextResponse.json({ error: 'report is required' }, { status: 400 });
    }

    const report = body.report;
    const page = report.pages[0];
    const criticalCount = page.issues.filter((i) => i.severity === 'critical').length;
    const warningCount = page.issues.filter((i) => i.severity === 'warning').length;
    const mainIssue =
      page.issues.find((i) => i.severity === 'critical')?.title ||
      page.issues.find((i) => i.severity === 'warning')?.title ||
      'Нет критических проблем';

    // IP hash (для аналитики, не храним raw IP)
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff?.split(',')[0]?.trim() || 'unknown';
    const { createHash } = await import('node:crypto');
    const ipHash = createHash('sha256').update(ip + process.env.DATABASE_URL).digest('hex').slice(0, 16);

    // 1. Сохраняем в PostgreSQL
    let dbSaved = false;
    try {
      await db.audit.create({
        data: {
          url: report.targetUrl,
          overallScore: report.overallScore,
          technicalScore: report.technicalScore,
          contentScore: report.contentScore,
          criticalCount,
          warningCount,
          topIssue: mainIssue,
          sitePhone: page.phones?.join(', ') || null,
          siteEmail: page.emails?.join(', ') || null,
          reportJson: report as unknown as Record<string, unknown>,
          ipHash,
        },
      });
      dbSaved = true;
    } catch (dbErr) {
      console.error('[/api/audit-save] DB save failed:', dbErr);
    }

    // 2. Параллельно отправляем в Google Sheets
    let sheetsSaved = false;
    if (isGoogleSheetsConfigured()) {
      sheetsSaved = await appendAudit({
        date: new Date().toISOString().split('T')[0],
        url: report.targetUrl,
        overall: report.overallScore,
        technical: report.technicalScore,
        content: report.contentScore,
        critical: criticalCount,
        warnings: warningCount,
        main_issue: mainIssue,
        contact_name: '',
        contact_phone: page.phones?.join(', ') || '',
        contact_email: page.emails?.join(', ') || '',
      });
    }

    return NextResponse.json({ ok: true, saved: dbSaved || sheetsSaved, db: dbSaved, sheets: sheetsSaved });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Audit save failed';
    console.error('[/api/audit-save] error:', msg, e);
    return NextResponse.json({ ok: true, saved: false, error: msg });
  }
}

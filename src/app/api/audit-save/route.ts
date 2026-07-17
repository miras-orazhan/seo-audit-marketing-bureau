import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { appendAudit, isGoogleSheetsConfigured } from '@/lib/google-sheets';
import type { AuditReport } from '@/lib/seo-types';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 10 сохранений аудитов в минуту на IP
const RATE_LIMIT = { routeId: 'audit-save', max: 10, windowMs: 60_000 };

interface AuditSaveBody {
  report: AuditReport;
  // Опционально — если пользователь оставил контакты после аудита
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

    // Если Google Sheets не настроен — тихо выходим (не блокируем UX)
    if (!isGoogleSheetsConfigured()) {
      console.warn('[/api/audit-save] Google Sheets не настроен — пропуск сохранения');
      return NextResponse.json({ ok: true, saved: false, reason: 'sheets_not_configured' });
    }

    const report = body.report;
    const page = report.pages[0];
    const criticalCount = page.issues.filter((i) => i.severity === 'critical').length;
    const warningCount = page.issues.filter((i) => i.severity === 'warning').length;
    // Главная проблема — первый критический или первое предупреждение
    const mainIssue =
      page.issues.find((i) => i.severity === 'critical')?.title ||
      page.issues.find((i) => i.severity === 'warning')?.title ||
      'Нет критических проблем';

    const saved = await appendAudit({
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      url: report.targetUrl,
      overall: report.overallScore,
      technical: report.technicalScore,
      content: report.contentScore,
      critical: criticalCount,
      warnings: warningCount,
      main_issue: mainIssue,
      // Телефон и email, найденные на проверяемом сайте
      contact_name: '',
      contact_phone: page.phones?.join(', ') || '',
      contact_email: page.emails?.join(', ') || '',
    });

    return NextResponse.json({ ok: true, saved });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Audit save failed';
    console.error('[/api/audit-save] error:', msg, e);
    // Возвращаем ok=true, чтобы не пугать пользователя — аудит уже отработал
    return NextResponse.json({ ok: true, saved: false, error: msg });
  }
}

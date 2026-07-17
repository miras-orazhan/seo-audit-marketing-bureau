import { NextRequest, NextResponse } from 'next/server';
import { auditPage } from '@/lib/seo-crawler';
import { rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 10 аудитов в минуту на IP — достаточно для нормального использования,
// но режет абьюз (DDoS через краулер, массовые запросы).
const RATE_LIMIT = { routeId: 'audit', max: 10, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json({ error: 'URL обязателен' }, { status: 400 });
    }

    // Общий timeout 20 сек — чтобы гарантированно уложиться в ALB-таймаут (30 сек).
    const page = await Promise.race([
      auditPage(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Аудит превысил 20 сек — сайт слишком медленный или недоступен')), 20000),
      ),
    ]);
    return NextResponse.json({ page });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Не удалось выполнить аудит';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// In-memory rate limiter (по IP-адресу)
// Не требует Redis/DB — достаточно для одного Next.js инстанса.
// Для multi-instance deployment нужен Redis-backed limiter.
// ============================================================

import { NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

// Map<key, Bucket> — key обычно `${routeId}:${ip}`
const buckets = new Map<string, Bucket>();

// Периодическая очистка старых bucket'ов — раз в 5 минут
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}

export interface RateLimitConfig {
  /** Уникальный идентификатор маршрута, например 'audit', 'analyze' */
  routeId: string;
  /** Максимум запросов за windowMs */
  max: number;
  /** Окно в миллисекундах */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Сколько запросов осталось в текущем окне */
  remaining: number;
  /** Через сколько мс окно сбросится */
  resetInMs: number;
  /** Заголовки для ответа клиенту */
  headers: Record<string, string>;
}

/**
 * Проверяет, можно ли пропустить запрос.
 * Использование:
 *   const rl = checkRateLimit(req, { routeId: 'audit', max: 10, windowMs: 60_000 });
 *   if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  // Достаём IP — учитываем X-Forwarded-For от прокси
  const xff = req.headers.get('x-forwarded-for');
  const ip =
    (xff && xff.split(',')[0].trim()) ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const key = `${config.routeId}:${ip}`;
  const now = Date.now();
  const resetAt = now + config.windowMs;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, config.max - bucket.count);
  const resetInMs = Math.max(0, bucket.resetAt - now);
  const allowed = bucket.count <= config.max;

  return {
    allowed,
    remaining,
    resetInMs,
    headers: {
      'X-RateLimit-Limit': String(config.max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetInMs / 1000)),
      ...(allowed ? {} : { 'Retry-After': String(Math.ceil(resetInMs / 1000)) }),
    },
  };
}

/**
 * Хелпер: возвращает 429-ответ с правильными заголовками, если лимит превышен.
 * Использование:
 *   const limited = rateLimitResponse(req, { routeId: 'audit', max: 10, windowMs: 60_000 });
 *   if (limited) return limited;  // уже вернул 429
 */
export function rateLimitResponse(
  req: Request,
  config: RateLimitConfig,
): NextResponse | null {
  const rl = checkRateLimit(req, config);
  if (rl.allowed) return null;
  return new NextResponse(
    JSON.stringify({
      error: `Слишком много запросов. Попробуйте через ${Math.ceil(rl.resetInMs / 1000)} сек.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...rl.headers,
      },
    },
  );
}

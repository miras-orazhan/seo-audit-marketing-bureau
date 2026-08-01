import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS middleware: позволяет статичному HTML на WordPress (или любом другом домене)
// ходить запросами к нашему backend. Без этого браузер блокирует cross-origin fetch.

const ALLOWED_ORIGINS = [
  // Локальная разработка
  'http://localhost:3000',
  'http://localhost:8888',
  'http://127.0.0.1:3000',
  // Z.ai preview
  /^https:\/\/preview-.*\.space-z\.ai$/,
  // Любой поддомен marketingbureau.kz (включая audit) (включая WordPress)
  /^https?:\/\/(www\.)?marketingbureau\.kz$/,
  // file:// для локального тестирования HTML
  'null',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((rule) =>
    rule instanceof RegExp ? rule.test(origin) : rule === origin,
  );
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');

  // Для preflight OPTIONS — отдаём 204 с CORS-заголовками
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (origin && isAllowedOrigin(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.headers.set('Access-Control-Max-Age', '86400');
    }
    return res;
  }

  const res = NextResponse.next();
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.headers.set('Access-Control-Allow-Credentials', 'false');
    // Vary: Origin — важно для кэширования
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export const config = {
  // Применяем только к API routes
  matcher: '/api/:path*',
};

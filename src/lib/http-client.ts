// ============================================================
// HTTP-клиент на node:https с принудительным IPv4
// (в песочнице IPv6 может быть ENETUNREACH, из-за чего fetch падает)
// ============================================================

import https from 'node:https';
import http from 'node:http';
import { lookup as dnsLookup } from 'node:dns/promises';

export interface HttpResponse {
  status: number;
  headers: Headers;
  body: string;
  finalUrl: string;
  redirectChain: string[];
}

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
}

export async function fetchUrl(
  url: string,
  opts: FetchOptions = {},
): Promise<HttpResponse> {
  const method = opts.method || 'GET';
  const timeout = opts.timeout || 20000;
  const followRedirects = opts.followRedirects !== false;
  const maxRedirects = opts.maxRedirects || 5;

  const redirectChain: string[] = [url];
  let currentUrl = url;
  let lastRes: HttpResponse | null = null;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const u = new URL(currentUrl);
    const lib = u.protocol === 'https:' ? https : http;

    // Принудительно резолвим через IPv4
    let addresses: { address: string; family: number }[];
    try {
      addresses = await dnsLookup(u.hostname, { all: true, family: 4 });
    } catch (e) {
      throw new Error(`DNS lookup failed for ${u.hostname}: ${(e as Error).message}`);
    }
    if (addresses.length === 0) {
      // Fallback — пусть Node сам резолвит
      addresses = [{ address: u.hostname, family: 4 }];
    }
    const ipv4 = addresses[0].address;

    const res = await new Promise<{
      status: number;
      headers: Record<string, string | string[] | undefined>;
      body: Buffer;
    }>((resolve, reject) => {
      const req = lib.request(
        {
          hostname: ipv4,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AISeoAuditor/1.0)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            Host: u.host,
            ...(opts.headers || {}),
          },
          servername: u.hostname,
          timeout,
          family: 4,
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => {
            resolve({
              status: r.statusCode || 0,
              headers: r.headers as Record<string, string | string[] | undefined>,
              body: Buffer.concat(chunks),
            });
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error(`Request timeout after ${timeout}ms`));
      });
      req.end();
    });

    // Нормализуем headers в Headers-объект
    const headers = new Headers();
    for (const [k, v] of Object.entries(res.headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        for (const item of v) headers.append(k, item);
      } else {
        headers.set(k, v);
      }
    }

    const isRedirect = res.status >= 300 && res.status < 400;
    const location = headers.get('location');

    if (isRedirect && followRedirects && location) {
      const nextUrl = new URL(location, currentUrl).toString();
      redirectChain.push(nextUrl);
      currentUrl = nextUrl;
      lastRes = {
        status: res.status,
        headers,
        body: res.body.toString('utf8'),
        finalUrl: currentUrl,
        redirectChain,
      };
      continue;
    }

    return {
      status: res.status,
      headers,
      body: res.body.toString('utf8'),
      finalUrl: currentUrl,
      redirectChain,
    };
  }

  return (
    lastRes || {
      status: 0,
      headers: new Headers(),
      body: '',
      finalUrl: currentUrl,
      redirectChain,
    }
  );
}

// Простой GET для проверки доступности (robots.txt, sitemap.xml)
export async function fetchRaw(
  url: string,
  opts: FetchOptions = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const r = await fetchUrl(url, { ...opts, followRedirects: true });
    return { ok: r.status >= 200 && r.status < 400, status: r.status, body: r.body };
  } catch {
    return { ok: false, status: 0, body: '' };
  }
}

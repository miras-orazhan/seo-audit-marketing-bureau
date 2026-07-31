// ============================================================
// Серверный SEO-краулер: fetch URL, парсинг HTML, тех. проверки
// Прямой regex-парсинг без построения DOM (упрощённый для прототипа)
// ============================================================

import type {
  PageAudit,
  TechIssue,
  MetaTags,
  HeadingItem,
  SchemaBlock,
  SecurityHeaders,
} from '@/lib/seo-types';
import { fetchUrl } from '@/lib/http-client';

const USER_AGENT =
  'Mozilla/5.0 (compatible; AISeoAuditor/1.0; +https://example.com/bot)';

function issue(
  category: TechIssue['category'],
  severity: TechIssue['severity'],
  title: string,
  description: string,
  recommendation: string,
  impact: number,
  effort: TechIssue['effort'],
): TechIssue {
  return {
    id: `iss-${Math.random().toString(36).slice(2, 10)}`,
    category,
    severity,
    title,
    description,
    recommendation,
    impact,
    effort,
  };
}

// ============================================================
// Утилиты парсинга HTML
// ============================================================

function getMeta(html: string, key: 'name' | 'property', value: string): string | null {
  const re = new RegExp(
    `<meta[^>]*${key}\\s*=\\s*["']${escapeReg(value)}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    'i',
  );
  const m = html.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${key}\\s*=\\s*["']${escapeReg(value)}["'][^>]*>`,
    'i',
  );
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : null;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function getCanonical(html: string): string | null {
  const m = html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (m) return m[1].trim();
  const m2 = html.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  return m2 ? m2[1].trim() : null;
}

function getLang(html: string): string | null {
  const m = html.match(/<html[^>]*\slang\s*=\s*["']([a-zA-Z-]+)["']/i);
  return m ? m[1].trim() : null;
}

function getHeadings(html: string): HeadingItem[] {
  const items: HeadingItem[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1], 10);
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) items.push({ level, text });
  }
  return items;
}

function getImages(html: string, baseUrl: string): { src: string; alt: string | null }[] {
  const imgs: { src: string; alt: string | null }[] = [];
  const re = /<img[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i) || tag.match(/data-src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
    try {
      const abs = new URL(srcMatch[1], baseUrl).toString();
      imgs.push({ src: abs, alt: altMatch ? altMatch[1].trim() : null });
    } catch {
      // некорректный URL — пропускаем
    }
  }
  return imgs.slice(0, 100);
}

// Извлечение favicon (любого: ico, png, svg)
function getFavicon(html: string, baseUrl: string): string | null {
  // 1. <link rel="icon" href="...">
  const re = /<link[^>]*rel\s*=\s*["'](?:shortcut\s+icon|icon|apple-touch-icon)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) {
      try {
        return new URL(hrefMatch[1], baseUrl).toString();
      } catch {
        // ignore
      }
    }
  }
  // 2. fallback: /favicon.ico
  try {
    return new URL('/favicon.ico', baseUrl).toString();
  } catch {
    return null;
  }
}

// Извлечение apple-touch-icon (для iOS)
function getAppleTouchIcon(html: string, baseUrl: string): string | null {
  const re = /<link[^>]*rel\s*=\s*["']apple-touch-icon["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const hrefMatch = m[0].match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) {
      try {
        return new URL(hrefMatch[1], baseUrl).toString();
      } catch {
        // ignore
      }
    }
  }
  return null;
}

// Извлечение theme-color (для Android Chrome)
function getThemeColor(html: string): string | null {
  const m = html.match(/<meta[^>]*name\s*=\s*["']theme-color["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (m) return m[1].trim();
  const m2 = html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']theme-color["']/i);
  return m2 ? m2[1].trim() : null;
}

// Проверка: человекопонятный URL (ЧПУ)
function analyzeUrlStructure(url: string): { isHumanReadable: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Если query-параметры есть — это не ЧПУ
    if (u.search && u.search.length > 0) {
      issues.push('URL содержит query-параметры — это не ЧПУ. Лучше использовать /category/post-name/');
    }

    // Если в пути есть .php / .asp / .aspx — это не ЧПУ
    if (/\.(php|asp|aspx|jsp|cgi)$/i.test(path)) {
      issues.push('URL содержит расширение файла (.php/.asp/.aspx) — это не ЧПУ.');
    }

    // Если в пути есть длинные числовые ID (более 5 цифр подряд)
    if (/\d{5,}/.test(path)) {
      issues.push('URL содержит длинный числовой ID — это не ЧПУ. Замените на слаг.');
    }

    // Если в пути есть /?p=123 или /index.php?id=456 — это не ЧПУ
    if (/[?&](p|id|page_id|post)=\d+/i.test(u.search)) {
      issues.push('URL использует параметры ?p=123 или ?id=456 — это WordPress без ЧПУ. Включите «Название записи» в Настройки → Постоянные ссылки.');
    }

    // Если путь — просто / (главная) — это ЧПУ
    if (path === '/' && issues.length === 0) {
      return { isHumanReadable: true, issues: [] };
    }

    // Если путь содержит только слаги (a-z, -, /) — это ЧПУ
    if (issues.length === 0 && /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/i.test(path)) {
      return { isHumanReadable: true, issues: [] };
    }

    return { isHumanReadable: issues.length === 0, issues };
  } catch {
    return { isHumanReadable: false, issues: ['Некорректный URL'] };
  }
}

// Проверка: редирект http → https
async function checkHttpsRedirect(host: string): Promise<boolean | null> {
  try {
    // Пробуем http:// и смотрим, редиректит ли на https://
    const httpUrl = `http://${host}/`;
    const r = await fetchUrl(httpUrl, { timeout: 5000, followRedirects: false, maxRedirects: 0 });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location') || '';
      if (loc.startsWith('https://') || loc.startsWith('//')) {
        return true;
      }
      // Относительный Location — не определяем
      return null;
    }
    if (r.status >= 200 && r.status < 300) {
      // HTTP отдаёт 200 без редиректа — нет https
      return false;
    }
    return null;
  } catch {
    // HTTP-запрос не прошёл — возможно только HTTPS
    return null;
  }
}

function countLinks(html: string, baseUrl: string) {
  let internal = 0;
  let external = 0;
  const internalSet = new Set<string>();
  const externalSet = new Set<string>();
  const re = /<a[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  const baseHost = new URL(baseUrl).hostname;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const abs = new URL(href, baseUrl);
      if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue;
      if (abs.hostname === baseHost) {
        internalSet.add(abs.pathname + abs.search);
      } else {
        externalSet.add(abs.hostname);
      }
    } catch {
      // битый href
    }
  }
  internal = internalSet.size;
  external = externalSet.size;
  return { internal, external };
}

// ============================================================
// Извлечение телефонов и email'ов со страницы
// ============================================================

// Извлечение телефонов: ищем tel: ссылки + телефоны в тексте
function extractPhones(html: string, baseUrl: string): string[] {
  const phones = new Set<string>();

  // 1. <a href="tel:...">
  const telRe = /<a[^>]*href\s*=\s*["']tel:([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = telRe.exec(html)) !== null) {
    const digits = m[1].replace(/[^\d+]/g, '');
    if (digits.length >= 10) phones.add(digits);
  }

  // 2. Телефоны в тексте — казахстанские и российские форматы
  // Ищем паттерны: +7 (XXX) XXX-XX-XX, +7XXXXXXXXXX, 8 (XXX) XXX-XX-XX,
  // +7 XXX XXX-XX-XX, +77XXXXXXXXX и т.д.
  const phonePatterns = [
    // +7 (XXX) XXX-XX-XX или +7 (XXX) XXX XX XX
    /\+7[\s(]*(\d{3})[\s)]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/g,
    // 8 (XXX) XXX-XX-XX
    /8[\s(]*(\d{3})[\s)]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/g,
    // +7XXXXXXXXXX (11 цифр подряд начиная с 7)
    /\+?(7\d{10})\b/g,
    // 8XXXXXXXXXX (11 цифр начиная с 8)
    /\b8(\d{10})\b/g,
  ];

  // Убираем HTML-теги, оставляем только текст
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  for (const pattern of phonePatterns) {
    while ((m = pattern.exec(text)) !== null) {
      // Собираем все цифры из match
      const digits = (m[0] || '').replace(/[^\d]/g, '');
      if (digits.length >= 10 && digits.length <= 13) {
        // Нормализуем: если начинается с 8 — заменяем на 7
        let normalized = digits;
        if (normalized.startsWith('8') && normalized.length === 11) {
          normalized = '7' + normalized.slice(1);
        }
        if (normalized.startsWith('7') && normalized.length === 11) {
          phones.add('+' + normalized);
        } else if (normalized.length === 10) {
          // Возможно, без кода страны — добавляем +7
          phones.add('+7' + normalized);
        }
      }
    }
  }

  // Возвращаем первые 5 уникальных телефонов
  return Array.from(phones).slice(0, 5);
}

// Извлечение email'ов: mailto: ссылки + email в тексте
function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  // 1. <a href="mailto:...">
  const mailtoRe = /<a[^>]*href\s*=\s*["']mailto:([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    const email = m[1].trim().toLowerCase();
    if (email && email.includes('@')) emails.add(email);
  }

  // 2. Email в тексте
  const text = html.replace(/<[^>]+>/g, ' ');
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  while ((m = emailRe.exec(text)) !== null) {
    const email = m[0].trim().toLowerCase();
    // Фильтруем мусор (image.png@2x и т.п.)
    if (email && !email.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i)) {
      emails.add(email);
    }
  }

  return Array.from(emails).slice(0, 5);
}

function getSchemas(html: string): SchemaBlock[] {
  const blocks: SchemaBlock[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        const type = item['@type'] || 'Unknown';
        const typeStr = Array.isArray(type) ? type.join(', ') : String(type);
        const hasType = !!item['@type'];
        const hasContext = !!item['@context'];
        const errors: string[] = [];
        if (!hasType) errors.push('Missing @type');
        if (!hasContext) errors.push('Missing @context (рекомендуется)');
        blocks.push({
          type: typeStr,
          raw: raw.slice(0, 500),
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        });
      }
    } catch {
      blocks.push({
        type: 'Invalid JSON',
        raw: raw.slice(0, 500),
        valid: false,
        errors: ['JSON parse error'],
      });
    }
  }
  return blocks;
}

function extractMainContent(html: string): { sample: string; wordCount: number } {
  // Удаляем script/style/noscript/nav/footer/header/aside
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // Пытаемся вытащить <main> или <article>
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i) || cleaned.match(/<article[\s\S]*?<\/article>/i);
  if (mainMatch) cleaned = mainMatch[0];

  // Убираем теги
  const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sample = text.slice(0, 3000);
  const wordCount = text ? text.split(/\s+/).length : 0;
  return { sample, wordCount };
}

async function checkRobotsAndSitemap(origin: string): Promise<{ robots: boolean; sitemap: boolean; sitemapUrls: number }> {
  let robotsFound = false;
  let sitemapFound = false;
  let sitemapUrls = 0;
  try {
    const r = await fetchUrl(`${origin}/robots.txt`, { timeout: 5000 });
    if (r.status >= 200 && r.status < 400) {
      robotsFound = true;
      const txt = r.body;
      const smMatch = txt.match(/sitemap:\s*(\S+)/i);
      if (smMatch) {
        try {
          const smRes = await fetchUrl(smMatch[1], { timeout: 5000 });
          if (smRes.status >= 200 && smRes.status < 400) {
            sitemapFound = true;
            sitemapUrls = (smRes.body.match(/<url>/gi) || []).length || (smRes.body.match(/<loc>/gi) || []).length;
          }
        } catch {
          // sitemap недоступен
        }
      }
    }
  } catch {
    // robots недоступен
  }
  if (!sitemapFound) {
    try {
      const smRes = await fetchUrl(`${origin}/sitemap.xml`, { timeout: 5000 });
      if (smRes.status >= 200 && smRes.status < 400) {
        sitemapFound = true;
        sitemapUrls = (smRes.body.match(/<url>/gi) || []).length || (smRes.body.match(/<loc>/gi) || []).length;
      }
    } catch {
      // sitemap недоступен
    }
  }
  return { robots: robotsFound, sitemap: sitemapFound, sitemapUrls };
}

function assessSecurityHeaders(headers: Headers): { headers: SecurityHeaders; issues: TechIssue[] } {
  const securityHeaders: SecurityHeaders = {
    'strict-transport-security': headers.get('strict-transport-security') || undefined,
    'content-security-policy': headers.get('content-security-policy') || undefined,
    'x-frame-options': headers.get('x-frame-options') || undefined,
    'x-content-type-options': headers.get('x-content-type-options') || undefined,
    'referrer-policy': headers.get('referrer-policy') || undefined,
    'permissions-policy': headers.get('permissions-policy') || undefined,
  };
  const issues: TechIssue[] = [];
  if (!securityHeaders['strict-transport-security']) {
    issues.push(issue('security', 'warning', 'Missing HSTS header', 'Strict-Transport-Security не установлен — сайт уязвим к SSL-стриппингу.', 'Добавьте Strict-Transport-Security: max-age=31536000; includeSubDomains', 30, 'low'));
  }
  if (!securityHeaders['content-security-policy']) {
    issues.push(issue('security', 'info', 'Missing Content-Security-Policy', 'CSP не настроен — повышенный риск XSS.', 'Определите минимальный CSP, разрешающий только нужные домены.', 20, 'medium'));
  }
  if (!securityHeaders['x-frame-options'] && !securityHeaders['permissions-policy']?.includes('frame')) {
    issues.push(issue('security', 'info', 'Missing X-Frame-Options', 'Без X-Frame-Options страницу можно встроить в iframe (clickjacking).', 'Установите X-Frame-Options: SAMEORIGIN или используйте permissions-policy.', 15, 'low'));
  }
  if (!securityHeaders['x-content-type-options']) {
    issues.push(issue('security', 'info', 'Missing X-Content-Type-Options', 'Без X-Content-Type-Options: nosniff браузер может MIME-сниффить.', 'Установите X-Content-Type-Options: nosniff', 10, 'low'));
  }
  return { headers: securityHeaders, issues };
}

// ============================================================
// Анализ семантического ядра
// ============================================================
function analyzeSemanticCore(text: string, totalWords: number) {
  // Стоп-слова (русские + английские)
  const stopWords = new Set([
    'и', 'в', 'на', 'с', 'по', 'для', 'не', 'что', 'это', 'как', 'а', 'то',
    'of', 'the', 'to', 'a', 'in', 'is', 'it', 'for', 'and', 'on', 'with',
    'от', 'до', 'при', 'за', 'из', 'у', 'о', 'же', 'бы', 'ли', 'вы', 'мы',
    'или', 'но', 'так', 'этом', 'когда', 'где', 'если', 'был', 'она', 'он',
    'они', 'его', 'её', 'их', 'вас', 'нас', 'эти', 'те', 'все', 'всё',
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  ]);

  // Разбиваем на слова (только буквы, минимум 3 символа)
  const words = text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter(w => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));

  const wordCount: Record<string, number> = {};
  for (const w of words) {
    wordCount[w] = (wordCount[w] || 0) + 1;
  }

  // Топ-10 ключевых слов
  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: totalWords > 0 ? Math.round((count / totalWords) * 1000) / 10 : 0,
    }));

  const uniqueWords = Object.keys(wordCount).length;
  const avgWordLength = words.length > 0
    ? Math.round((words.reduce((s, w) => s + w.length, 0) / words.length) * 10) / 10
    : 0;

  let recommendation = 'Хорошее семантическое ядро.';
  if (sorted.length === 0) {
    recommendation = 'Недостаточно текста для анализа семантики. Добавьте 300+ слов.';
  } else if (sorted[0].density < 0.5) {
    recommendation = 'Ключевые слова имеют низкую плотность (<0.5%). Увеличьте релевантность контента.';
  } else if (sorted[0].density > 5) {
    recommendation = 'Осторожно: ключевое слово имеет высокую плотность (>5%) — возможен keyword stuffing.';
  }

  return {
    topKeywords: sorted,
    totalWords,
    uniqueWords,
    avgWordLength,
    recommendation,
  };
}

// ============================================================
// Анализ читабельности (readability)
// ============================================================
function analyzeReadability(text: string) {
  // Разбиваем на предложения (по . ! ?)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  const sentenceCount = sentences.length || 1;
  const wordCount = words.length || 1;

  const avgSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10;
  const avgWordLength = Math.round((words.reduce((s, w) => s + w.length, 0) / wordCount) * 10) / 10;

  // Длинные предложения (>20 слов)
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 20).length;

  // Простая формула: 100 - penalty за длинные предложения и слова
  let score = 100;
  score -= (avgSentenceLength - 12) * 3; // идеал ~12 слов/предложение
  score -= (avgWordLength - 5) * 5; // идеал ~5 символов/слово
  score -= longSentences * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = 'Средний';
  if (score >= 80) level = 'Лёгкий';
  else if (score < 50) level = 'Сложный';

  let recommendation = 'Текст легко читается.';
  if (score < 50) {
    recommendation = 'Текст сложный для чтения. Сократите предложения до 12-15 слов, упростите лексику.';
  } else if (score < 70) {
    recommendation = 'Текст средней сложности. Разбейте длинные предложения на короткие.';
  }

  return {
    score,
    avgSentenceLength,
    avgWordLength,
    longSentences,
    level,
    recommendation,
  };
}

// ============================================================
// Анализ структуры внутренних ссылок
// ============================================================
function analyzeInternalLinks(html: string, baseUrl: string) {
  const baseHost = new URL(baseUrl).hostname;
  const linkRe = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const anchorCounts: Record<string, number> = {};
  let totalLinks = 0;
  let uniqueTargets = 0;
  let nofollowCount = 0;
  const targets = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const anchorText = m[2].replace(/<[^>]+>/g, '').trim();

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

    try {
      const abs = new URL(href, baseUrl);
      if (abs.hostname !== baseHost) continue; // только внутренние

      totalLinks++;
      targets.add(abs.pathname);

      if (anchorText) {
        anchorCounts[anchorText] = (anchorCounts[anchorText] || 0) + 1;
      }

      // Проверяем rel="nofollow"
      const fullTag = m[0];
      if (/rel\s*=\s*["'][^"']*nofollow/i.test(fullTag)) {
        nofollowCount++;
      }
    } catch {}
  }

  uniqueTargets = targets.size;

  const topAnchors = Object.entries(anchorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));

  let recommendation = 'Хорошая структура внутренних ссылок.';
  if (totalLinks < 3) {
    recommendation = 'Мало внутренних ссылок. Добавьте ссылки на связанные страницы для лучшей перелинковки.';
  } else if (uniqueTargets < totalLinks * 0.5) {
    recommendation = 'Много дублирующих ссылок на одни и те же страницы. Разнообразьте анкоры.';
  }

  return {
    totalLinks,
    uniqueTargets,
    topAnchors,
    nofollowCount,
    recommendation,
  };
}

// ============================================================
// Главная функция: аудит одной страницы
// ============================================================

export async function auditPage(targetUrl: string): Promise<PageAudit> {
  let normalized = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  let urlObj: URL;
  try {
    urlObj = new URL(normalized);
  } catch {
    throw new Error('Некорректный URL');
  }
  const finalTarget = urlObj.toString();

  // ПАРАЛЛЕЛЬНО: главный fetch + robots/sitemap + http→https проверка.
  // Раньше было последовательно — до 44 сек в худшем случае, ALB рвал на 30-й.
  const startTime = Date.now();
  const [res, robotsSitemap, httpsRedirect] = await Promise.all([
    fetchUrl(finalTarget, { timeout: 12000 }),
    checkRobotsAndSitemap(`${urlObj.protocol}//${urlObj.host}`),
    checkHttpsRedirect(urlObj.host),
  ]);
  const loadTimeMs = Date.now() - startTime;
  const { robots: robotsFound, sitemap: sitemapFound, sitemapUrls } = robotsSitemap;

  // fetchUrl уже возвращает редирект-цепочку
  const redirectChain = res.redirectChain.length > 0 ? res.redirectChain : [finalTarget];
  const finalUrl = res.finalUrl || finalTarget;

  const html = res.body;
  const responseSizeKb = Math.round((Buffer.byteLength(html) / 1024) * 10) / 10;

  const title = getTitle(html);
  const description = getMeta(html, 'name', 'description');
  const meta: MetaTags = {
    title,
    titleLength: title?.length || 0,
    description,
    descriptionLength: description?.length || 0,
    canonical: getCanonical(html),
    ogTitle: getMeta(html, 'property', 'og:title'),
    ogDescription: getMeta(html, 'property', 'og:description'),
    ogImage: getMeta(html, 'property', 'og:image'),
    ogType: getMeta(html, 'property', 'og:type'),
    ogUrl: getMeta(html, 'property', 'og:url'),
    twitterCard: getMeta(html, 'name', 'twitter:card'),
    robots: getMeta(html, 'name', 'robots'),
    language: getLang(html),
    favicon: getFavicon(html, finalTarget),
    appleTouchIcon: getAppleTouchIcon(html, finalTarget),
    themeColor: getThemeColor(html),
  };

  // Анализ структуры URL (ЧПУ)
  const urlStructure = analyzeUrlStructure(finalUrl);

  const headings = getHeadings(html);
  const { sample, wordCount } = extractMainContent(html);
  const images = getImages(html, finalTarget);
  const { internal: internalLinks, external: externalLinks } = countLinks(html, finalTarget);
  const phones = extractPhones(html, finalTarget);
  const emails = extractEmails(html);
  const schemas = getSchemas(html);
  const { headers: securityHeaders, issues: securityIssues } = assessSecurityHeaders(res.headers);

  const viewportMeta = getMeta(html, 'name', 'viewport');
  const isMobileFriendly = !!viewportMeta && (viewportMeta.includes('width=device-width') || viewportMeta.includes('initial-scale'));

  // Новые анализы: семантическое ядро, readability, структура ссылок
  const semanticCore = analyzeSemanticCore(sample, wordCount);
  const readability = analyzeReadability(sample);
  const internalLinkStructure = analyzeInternalLinks(html, finalTarget);

  // ============================================================
  // Технические проверки
  // ============================================================
  const issues: TechIssue[] = [];

  // 1. Статус
  if (res.status >= 400) {
    issues.push(issue('status', 'critical', `Сервер вернул ${res.status}`, `HTTP ${res.status} — страница недоступна для пользователей и поисковиков.`, 'Верните 200 OK, исправьте серверную ошибку или настройте корректный 301 на рабочую страницу.', 100, 'medium'));
  } else if (res.status >= 300) {
    issues.push(issue('status', 'warning', `Редирект ${res.status}`, `Страница отдаёт ${res.status} — теряется вес при индексации.`, 'Используйте 301 вместо 302/307 для постоянных редиректов.', 40, 'low'));
  } else {
    issues.push(issue('status', 'ok', `Статус ${res.status} OK`, 'Страница корректно отдаётся.', '', 0, 'low'));
  }

  // 2. Редирект-цепочка
  if (redirectChain.length > 2) {
    issues.push(issue('status', 'warning', `Длинная редирект-цепочка (${redirectChain.length - 1} шага)`, `Цепочка: ${redirectChain.join(' → ')}`, 'Сократите цепочку до одного 301-редиректа.', 25, 'low'));
  }

  // 3. Title
  if (!meta.title) {
    issues.push(issue('meta', 'critical', 'Отсутствует <title>', 'Title не задан — поисковики не поймут, о чём страница.', 'Добавьте уникальный title 50–60 символов с целевым ключом в начале.', 90, 'low'));
  } else if (meta.titleLength < 30) {
    issues.push(issue('meta', 'warning', `Слишком короткий title (${meta.titleLength} симв.)`, `Текущий: "${meta.title}"`, 'Расширьте до 50–60 символов, добавьте уточняющие слова и бренд.', 50, 'low'));
  } else if (meta.titleLength > 65) {
    issues.push(issue('meta', 'warning', `Слишком длинный title (${meta.titleLength} симв.)`, `Текущий: "${meta.title}"`, 'Сократите до 60 символов, иначе поисковики обрежут.', 40, 'low'));
  } else {
    issues.push(issue('meta', 'ok', 'Title оптимальной длины', `${meta.titleLength} симв. — в пределах 50–65.`, '', 0, 'low'));
  }

  // 4. Description
  if (!meta.description) {
    issues.push(issue('meta', 'critical', 'Отсутствует meta description', 'Без description поисковики сами генерируют сниппет, часто неудачно.', 'Напишите description 140–160 символов с целевым ключом и CTA.', 70, 'low'));
  } else if (meta.descriptionLength < 120) {
    issues.push(issue('meta', 'warning', `Короткое description (${meta.descriptionLength} симв.)`, `Текущий: "${meta.description}"`, 'Расширьте до 150–160 символов для более информативного сниппета.', 35, 'low'));
  } else if (meta.descriptionLength > 170) {
    issues.push(issue('meta', 'warning', `Длинное description (${meta.descriptionLength} симв.)`, `Текущий: "${meta.description}"`, 'Сократите до 160 символов, чтобы не обрезалось в выдаче.', 25, 'low'));
  } else {
    issues.push(issue('meta', 'ok', 'Description оптимальной длины', `${meta.descriptionLength} симв. — в пределах 140–170.`, '', 0, 'low'));
  }

  // 5. Canonical
  if (!meta.canonical) {
    issues.push(issue('canonical', 'warning', 'Отсутствует canonical', 'Без canonical возможны проблемы с дубликатами при разных URL-параметрах.', 'Добавьте <link rel="canonical" href="..."> на каноническую версию.', 45, 'low'));
  } else {
    try {
      const canonUrl = new URL(meta.canonical, finalTarget).toString();
      if (canonUrl !== finalUrl && canonUrl !== finalTarget) {
        issues.push(issue('canonical', 'info', 'Canonical указывает на другой URL', `canonical: ${canonUrl}, страница: ${finalUrl}`, 'Убедитесь, что canonical корректно указывает на индексируемую версию.', 20, 'low'));
      } else {
        issues.push(issue('canonical', 'ok', 'Canonical задан корректно', meta.canonical, '', 0, 'low'));
      }
    } catch {
      issues.push(issue('canonical', 'warning', 'Некорректный canonical URL', meta.canonical, 'Исправьте URL в canonical.', 30, 'low'));
    }
  }

  // 6. H1
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push(issue('meta', 'critical', 'Отсутствует H1', 'H1 — главный заголовок страницы, без него поисковикам сложнее понять тему.', 'Добавьте ровно один H1 с целевым ключевым запросом.', 65, 'low'));
  } else if (h1Count > 1) {
    issues.push(issue('meta', 'warning', `Несколько H1 (${h1Count} шт.)`, 'Несколько H1 размывают семантическую структуру.', 'Оставьте один H1, остальные сделайте H2.', 35, 'low'));
  } else {
    issues.push(issue('meta', 'ok', 'H1 присутствует (1 шт.)', headings.find((h) => h.level === 1)?.text || '', '', 0, 'low'));
  }

  // 7. Структура заголовков
  const h2Count = headings.filter((h) => h.level === 2).length;
  if (h2Count === 0 && wordCount > 300) {
    issues.push(issue('meta', 'warning', 'Нет H2 подзаголовков', 'Длинный текст без подзаголовков хуже читается и индексируется.', 'Разбейте текст на блоки с H2/H3.', 40, 'medium'));
  }

  // 8. Объём контента
  if (wordCount < 300) {
    issues.push(issue('meta', 'warning', `Мало контента (${wordCount} слов)`, 'Страницы с <300 слов редко ранжируются в топе.', 'Расширьте контент до 600–1500 слов с учётом интента.', 55, 'high'));
  } else if (wordCount > 50) {
    issues.push(issue('meta', 'ok', `Достаточно контента (${wordCount} слов)`, 'Объём контента в норме.', '', 0, 'low'));
  }

  // 9. Изображения без alt
  const imagesNoAlt = images.filter((img) => !img.alt).length;
  if (imagesNoAlt > 0) {
    issues.push(issue('meta', 'warning', `${imagesNoAlt} изображений без alt`, 'Alt важен для доступности и image-search.', 'Пропишите alt для всех содержательных изображений.', 30, 'low'));
  }

  // 10. robots.txt
  if (!robotsFound) {
    issues.push(issue('robots', 'warning', 'robots.txt не найден', 'Без robots.txt поисковики не получают инструкций по краулингу.', 'Создайте /robots.txt, даже пустой — он показывает, что краулинг разрешён.', 40, 'low'));
  } else {
    issues.push(issue('robots', 'ok', 'robots.txt найден', 'Файл доступен.', '', 0, 'low'));
  }

  // 11. Sitemap
  if (!sitemapFound) {
    issues.push(issue('sitemap', 'warning', 'sitemap.xml не найден', 'Без sitemap медленнее индексация новых страниц.', 'Сгенерируйте sitemap.xml и пропишите его в robots.txt.', 35, 'low'));
  } else {
    issues.push(issue('sitemap', 'ok', `sitemap.xml найден (${sitemapUrls} URL)`, 'Sitemap доступен.', '', 0, 'low'));
  }

  // 12. Schema.org
  if (schemas.length === 0) {
    issues.push(issue('schema', 'warning', 'Нет structured data (schema.org)', 'Без JSON-LD нет расширенных сниппетов в выдаче (rating, FAQ, breadcrumbs).', 'Добавьте минимум Organization / WebSite / BreadcrumbList JSON-LD.', 40, 'medium'));
  } else {
    const invalid = schemas.filter((s) => !s.valid);
    if (invalid.length > 0) {
      issues.push(issue('schema', 'warning', `${invalid.length} невалидных schema-блоков`, invalid.map((s) => `${s.type}: ${(s.errors || []).join(', ')}`).join('; '), 'Исправьте JSON-LD валидацию через Google Rich Results Test.', 30, 'medium'));
    } else {
      issues.push(issue('schema', 'ok', `${schemas.length} schema-блоков, все валидны`, schemas.map((s) => s.type).join(', '), '', 0, 'low'));
    }
  }

  // 13. Mobile
  if (!isMobileFriendly) {
    issues.push(issue('mobile', 'critical', 'Не настроен viewport meta', 'Без viewport мобильные устройства показывают десктопную версию.', 'Добавьте <meta name="viewport" content="width=device-width, initial-scale=1">.', 75, 'low'));
  } else {
    issues.push(issue('mobile', 'ok', 'Viewport meta настроен', 'Мобильная адаптивность включена.', '', 0, 'low'));
  }

  // 14. Open Graph (полная проверка)
  if (!meta.ogTitle || !meta.ogDescription || !meta.ogImage) {
    issues.push(issue('meta', 'info', 'Не все Open Graph теги заданы', `og:title: ${meta.ogTitle ? '✓' : '✗'}, og:description: ${meta.ogDescription ? '✓' : '✗'}, og:image: ${meta.ogImage ? '✓' : '✗'}, og:type: ${meta.ogType ? '✓' : '✗'}, og:url: ${meta.ogUrl ? '✓' : '✗'}`, 'Пропишите og:title, og:description, og:image, og:type, og:url для красивых превью в соцсетях и мессенджерах.', 25, 'low'));
  } else if (!meta.ogType || !meta.ogUrl) {
    issues.push(issue('meta', 'info', 'Не все Open Graph теги заданы', `og:type: ${meta.ogType ? '✓' : '✗'}, og:url: ${meta.ogUrl ? '✓' : '✗'}`, 'Добавьте og:type (website/article) и og:url (канонический URL страницы).', 20, 'low'));
  } else {
    issues.push(issue('meta', 'ok', 'Open Graph теги заданы', `og:title, og:description, og:image, og:type, og:url — все на месте.`, '', 0, 'low'));
  }

  // 14.1. Twitter Card
  if (!meta.twitterCard) {
    issues.push(issue('meta', 'info', 'Отсутствует twitter:card', 'Без twitter:card превью в Twitter/X может отображаться криво.', 'Добавьте <meta name="twitter:card" content="summary_large_image"> + twitter:title, twitter:description, twitter:image.', 15, 'low'));
  } else {
    issues.push(issue('meta', 'ok', `Twitter Card: ${meta.twitterCard}`, 'Превью в Twitter/X настроено.', '', 0, 'low'));
  }

  // 14.2. Favicon
  if (!meta.favicon) {
    issues.push(issue('meta', 'warning', 'Favicon не найден', 'Без favicon браузеры показывают дефолтную иконку, хуже узнаваемость бренда в вкладках.', 'Добавьте <link rel="icon" href="/favicon.ico"> или PNG/SVG favicon.', 35, 'low'));
  } else {
    issues.push(issue('meta', 'ok', 'Favicon задан', meta.favicon, '', 0, 'low'));
  }

  // 14.3. Apple Touch Icon (iOS)
  if (!meta.appleTouchIcon) {
    issues.push(issue('mobile', 'info', 'Отсутствует apple-touch-icon', 'Без apple-touch-icon иконка сайта на iOS (home screen) выглядит как скриншот страницы.', 'Добавьте <link rel="apple-touch-icon" href="/apple-touch-icon.png"> (180x180 PNG).', 20, 'low'));
  } else {
    issues.push(issue('mobile', 'ok', 'Apple Touch Icon задан', meta.appleTouchIcon, '', 0, 'low'));
  }

  // 14.4. Theme Color (Android Chrome)
  if (!meta.themeColor) {
    issues.push(issue('mobile', 'info', 'Отсутствует theme-color', 'Без theme-color Android Chrome не окрашивает адресную строку в цвет бренда.', 'Добавьте <meta name="theme-color" content="#F59E0B">.', 15, 'low'));
  } else {
    issues.push(issue('mobile', 'ok', `Theme Color: ${meta.themeColor}`, 'Android Chrome покрасит адресную строку.', '', 0, 'low'));
  }

  // 14.5. ЧПУ (человекопонятный URL)
  if (!urlStructure.isHumanReadable) {
    const desc = urlStructure.issues.join(' ');
    issues.push(issue('meta', 'warning', 'URL не ЧПУ (не человекопонятный)', desc, 'Включите ЧПУ: для WordPress — Настройки → Постоянные ссылки → «Название записи». Структура /category/post-name/ лучше, чем ?p=123.', 35, 'medium'));
  } else {
    issues.push(issue('meta', 'ok', 'URL человекопонятный (ЧПУ)', finalUrl, '', 0, 'low'));
  }

  // 14.6. Редирект HTTP → HTTPS
  if (httpsRedirect === false) {
    issues.push(issue('security', 'critical', 'Нет редиректа HTTP → HTTPS', 'HTTP-версия доступна без редиректа на HTTPS — поисковики могут индексировать обе версии, дубли контента.', 'Настройте 301-редирект с http:// на https:// в .htaccess / Nginx / Caddy.', 70, 'low'));
  } else if (httpsRedirect === true) {
    issues.push(issue('security', 'ok', 'Редирект HTTP → HTTPS работает', 'HTTP автоматически перенаправляет на HTTPS.', '', 0, 'low'));
  } else {
    // null — HTTP недоступен, что нормально для HTTPS-only сайтов
    issues.push(issue('security', 'info', 'HTTP-версия недоступна', 'Сайт доступен только по HTTPS — это нормально.', '', 0, 'low'));
  }

  // 15. Performance: размер ответа
  if (responseSizeKb > 500) {
    issues.push(issue('performance', 'warning', `Тяжёлая HTML-страница (${responseSizeKb} KB)`, 'Большой размер замедляет LCP и FCP.', 'Оптимизируйте изображения, минифицируйте CSS/JS, включите gzip/brotli.', 40, 'medium'));
  }

  // 16. Performance: TTFB
  if (loadTimeMs > 2500) {
    issues.push(issue('performance', 'warning', `Медленный ответ сервера (${loadTimeMs} мс)`, 'TTFB > 2.5с негативно влияет на краулинг и UX.', 'Оптимизируйте backend/CDN, включите кэширование.', 45, 'medium'));
  }

  // Security
  issues.push(...securityIssues);

  const page: PageAudit = {
    url: finalTarget,
    status: res.status,
    finalUrl,
    redirectChain,
    loadTimeMs,
    responseSizeKb,
    meta,
    headings,
    wordCount,
    contentTextSample: sample,
    images,
    internalLinks,
    externalLinks,
    brokenLinks: [],
    schemas,
    securityHeaders,
    robotsTxtFound: robotsFound,
    sitemapXmlFound: sitemapFound,
    isMobileFriendly,
    httpsRedirect,
    phones,
    emails,
    urlStructure,
    semanticCore,
    readability,
    internalLinkStructure,
    issues,
  };

  return page;
}

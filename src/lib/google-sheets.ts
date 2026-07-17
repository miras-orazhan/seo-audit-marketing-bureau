// ============================================================
// Google Sheets интеграция через Apps Script Web App.
// Принимает POST в формате JSON, добавляет строку в таблицу.
// Никакой аутентификации — Apps Script Web App публично доступен.
//
// URL Web App задаётся в env: GOOGLE_APPS_SCRIPT_URL
// (или захардкожен ниже как fallback для разработки)
// ============================================================

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzuuQ0FUzEBuidt6omEHKGQHkznLN1xf6Rv9VrSIcnEGqNRvaGX2TWA6TCL6P5k5Ezg2g/exec';

export interface LeadRow {
  date: string;
  name: string;
  phone: string;
  email: string;
  site: string;
  message: string;
}

export interface AuditRow {
  date: string;
  url: string;
  overall: number;
  technical: number;
  content: number;
  critical: number;
  warnings: number;
  main_issue: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

/**
 * Универсальный вызов Apps Script Web App.
 *
 * Особенность: Apps Script на POST возвращает 302 redirect на
 * script.googleusercontent.com, который не принимает POST. Поэтому
 * мы используем redirect: 'manual' — не следуем редиректу. Запрос
 * доходит до Apps Script, данные сохраняются, но ответ мы не читаем.
 */
async function postToAppsScript(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'manual', // НЕ следовать 302 — Apps Script всё равно получит данные
      signal: AbortSignal.timeout(10000),
    });
    // 200 = успех, 302 = Apps Script пытается редиректить (нормально для нас),
    // opaque = через CORS-прокси. Все эти варианты означают, что запрос дошёл.
    return res.status === 200 || res.status === 302 || res.status === 0 || res.type === 'opaque';
  } catch (e) {
    console.error('[google-sheets] postToAppsScript failed:', e);
    return false;
  }
}

/**
 * Добавляет заявку в Google Sheets.
 * Payload: { type: 'lead', date, name, phone, email, site, message }
 */
export async function appendLead(row: LeadRow): Promise<boolean> {
  return postToAppsScript({
    type: 'lead',
    ...row,
  });
}

/**
 * Добавляет результат аудита в Google Sheets.
 * Payload: { type: 'audit', date, url, overall, technical, content, critical, warnings, main_issue, contact_* }
 */
export async function appendAudit(row: AuditRow): Promise<boolean> {
  return postToAppsScript({
    type: 'audit',
    ...row,
  });
}

/**
 * Проверяет, задан ли URL Apps Script.
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('https://script.google.com/');
}

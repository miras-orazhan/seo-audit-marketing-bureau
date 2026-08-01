// ============================================================
// Gemini AI клиент — нативный API (не OpenAI-compatible)
// Использует generateContent endpoint
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemma-4-31b-it';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Вызов Gemini generateContent API
 */
export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  options: { maxTokens?: number; temperature?: number; timeout?: number } = {}
): Promise<string> {
  const { maxTokens = 1000, temperature = 0.7, timeout = 30000 } = options;

  // Gemini format: system instruction + contents array
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: systemPrompt + '\n\n' + userContent }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
    },
  };

  const res = await fetch(
    `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `Gemini HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

/**
 * Вызов с историей сообщений (для чата)
 */
export async function geminiChatWithHistory(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: { maxTokens?: number; temperature?: number; timeout?: number } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7, timeout = 25000 } = options;

  // Конвертируем в формат Gemini
  const contents: GeminiMessage[] = [];

  // System prompt как первое сообщение от model
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Понял. Готов отвечать.' }],
  });

  for (const msg of messages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
    },
  };

  const res = await fetch(
    `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `Gemini HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

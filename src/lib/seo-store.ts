'use client';

import { create } from 'zustand';
import type {
  AuditReport,
  ChatMessage,
  PageAudit,
  TechIssue,
  RoadmapItem,
} from './seo-types';

type ScanStage =
  | 'idle'
  | 'fetching'
  | 'parsing'
  | 'tech_audit'
  | 'ai_analysis'
  | 'scoring'
  | 'done'
  | 'error';

interface AuditProgress {
  stage: ScanStage;
  message: string;
  percent: number;
}

interface SeoState {
  // Сканирование
  targetUrl: string;
  progress: AuditProgress;
  report: AuditReport | null;
  selectedPageUrl: string | null;
  isScanning: boolean;

  // Чат
  chatMessages: ChatMessage[];
  isChatThinking: boolean;
  isChatOpen: boolean;

  // Действия
  setTargetUrl: (url: string) => void;
  startScan: (url: string) => Promise<void>;
  setProgress: (p: Partial<AuditProgress>) => void;
  setReport: (r: AuditReport) => void;
  selectPage: (url: string | null) => void;
  reset: () => void;

  // Чат-действия
  toggleChat: (open?: boolean) => void;
  sendChatMessage: (text: string) => Promise<void>;
  pushChatMessage: (m: ChatMessage) => void;
  setChatThinking: (v: boolean) => void;
}

const STAGES: { stage: ScanStage; message: string; percent: number }[] = [
  { stage: 'fetching', message: 'Загружаем страницу и считаем заголовки ответа…', percent: 10 },
  { stage: 'parsing', message: 'Парсим HTML, извлекаем мета-теги и контент…', percent: 30 },
  { stage: 'tech_audit', message: 'Прогоняем технические проверки: canonical, schema, security…', percent: 50 },
  { stage: 'ai_analysis', message: 'AI анализирует интент и генерирует правки контента…', percent: 75 },
  { stage: 'scoring', message: 'Считаем скор 0–100 и строим приоритизированный roadmap…', percent: 95 },
];

export const useSeoStore = create<SeoState>((set, get) => ({
  targetUrl: '',
  progress: { stage: 'idle', message: '', percent: 0 },
  report: null,
  selectedPageUrl: null,
  isScanning: false,
  chatMessages: [],
  isChatThinking: false,
  isChatOpen: false,

  setTargetUrl: (url) => set({ targetUrl: url }),

  setProgress: (p) =>
    set((s) => ({ progress: { ...s.progress, ...p } })),

  setReport: (r) => set({ report: r }),

  selectPage: (url) => set({ selectedPageUrl: url }),

  reset: () =>
    set({
      targetUrl: '',
      progress: { stage: 'idle', message: '', percent: 0 },
      report: null,
      selectedPageUrl: null,
      isScanning: false,
      chatMessages: [],
      isChatThinking: false,
    }),

  startScan: async (url) => {
    set({
      targetUrl: url,
      isScanning: true,
      report: null,
      selectedPageUrl: null,
      chatMessages: [],
      progress: { stage: 'fetching', message: STAGES[0].message, percent: STAGES[0].percent },
    });

    try {
      // Шаг 1–3: технический аудит (серверный краулер)
      const techRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!techRes.ok) {
        const errText = await techRes.text();
        throw new Error(errText || `Тех. аудит упал: ${techRes.status}`);
      }
      const techData = (await techRes.json()) as { page: PageAudit };

      set({
        progress: { stage: 'ai_analysis', message: STAGES[3].message, percent: STAGES[3].percent },
      });

      // Шаг 4: Показываем результаты СРАЗУ — без ожидания AI
      // AI-анализ загрузится в фоне после показа дашборда
      const pageWithPlaceholder: PageAudit = {
        ...techData.page,
        aiAnalysis: {
          intent: { detected: 'Загрузка AI-анализа…', matchScore: 0, gaps: [] },
          contentScore: 0,
          summary: 'AI-анализ контента загружается в фоновом режиме. Технические результаты уже доступны ниже.',
          fixes: [],
        },
      };

      const { report: initialReport } = buildReport(pageWithPlaceholder);

      set({
        report: initialReport,
        progress: { stage: 'done', message: 'Готово', percent: 100 },
        isScanning: false,
      });

      // Шаг 5: Сохраняем аудит в БД + Google Sheets
      try {
        await fetch('/api/audit-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: initialReport }),
        });
      } catch { /* ignore */ }

      // Шаг 6: AI-анализ в ФОНЕ — простой POST, без SSE
      // Показываем тех. аудит сразу, AI обновит дашборд когда будет готов
      const progressMsgs = [
        'AI определяет поисковый интент…',
        'AI анализирует контент…',
        'AI генерирует правки…',
      ];
      let msgIdx = 0;
      const aiProgress = setInterval(() => {
        msgIdx = (msgIdx + 1) % progressMsgs.length;
        const cr = get().report;
        if (cr?.pages[0]?.aiAnalysis) {
          set({
            report: {
              ...cr,
              pages: [{
                ...cr.pages[0],
                aiAnalysis: { ...cr.pages[0].aiAnalysis!, summary: progressMsgs[msgIdx] },
              }],
            },
          });
        }
      }, 5000);

      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: techData.page }),
      })
        .then(r => r.json())
        .then(data => {
          clearInterval(aiProgress);
          if (data.ok && data.analysis) {
            const cr = get().report;
            if (!cr) return;
            const pageWithAi: PageAudit = { ...techData.page, aiAnalysis: data.analysis };
            const { report: updated } = buildReport(pageWithAi);
            set({ report: updated });
          }
        })
        .catch(() => {
          clearInterval(aiProgress);
          const cr = get().report;
          if (!cr) return;
          set({
            report: {
              ...cr,
              pages: [{
                ...cr.pages[0],
                aiAnalysis: {
                  intent: { detected: 'AI временно недоступен', matchScore: 0, gaps: [] },
                  contentScore: 50,
                  summary: 'Тех. аудит завершён. AI-анализ недоступен — результаты ниже.',
                  fixes: [],
                },
              }],
            },
          });
        });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
      set({
        progress: { stage: 'error', message: msg, percent: 0 },
        isScanning: false,
      });
    }
  },

  toggleChat: (open) =>
    set((s) => ({ isChatOpen: open !== undefined ? open : !s.isChatOpen })),

  pushChatMessage: (m) => set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  setChatThinking: (v) => set({ isChatThinking: v }),

  sendChatMessage: async (text) => {
    const state = get();
    const report = state.report;
    if (!report) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ chatMessages: [...s.chatMessages, userMsg], isChatThinking: true }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: state.chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          reportSummary: serializeReportForChat(report),
        }),
      });
      if (!res.ok) throw new Error(`chat failed: ${res.status}`);
      const data = (await res.json()) as { reply: string };
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ chatMessages: [...s.chatMessages, aiMsg] }));
    } catch {
      const errMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'Не удалось получить ответ от ассистента. Попробуйте ещё раз.',
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ chatMessages: [...s.chatMessages, errMsg] }));
    } finally {
      set({ isChatThinking: false });
    }
  },
}));

// ============================================================
// Детерминированный скоринг и roadmap
// ============================================================

function buildReport(page: PageAudit): { report: AuditReport } {
  // Технический скор: считаем по issue
  const techIssues = page.issues;
  const techPenalty = techIssues.reduce((sum, i) => {
    const sevWeight = i.severity === 'critical' ? 18 : i.severity === 'warning' ? 8 : i.severity === 'info' ? 2 : 0;
    return sum + sevWeight;
  }, 0);
  const technicalScore = Math.max(0, Math.min(100, 100 - techPenalty));

  // Контентный скор
  const contentScore = page.aiAnalysis?.contentScore ?? 50;

  // AEO скор (Answer Engine Optimization) — на основе FAQ, schema, readability
  let aeoScore = 50;
  if (page.schemas.length > 0) aeoScore += 15;
  if (page.aiAnalysis?.fixes.some(f => f.type === 'faq_schema')) aeoScore += 15;
  if (page.readability.score >= 70) aeoScore += 10;
  if (page.wordCount >= 300) aeoScore += 10;
  aeoScore = Math.min(100, aeoScore);

  // GEO скор (Generative Engine Optimization) — на основе E-E-A-T сигналов
  let geoScore = 40;
  if (page.meta.ogTitle && page.meta.ogDescription && page.meta.ogImage) geoScore += 15;
  if (page.schemas.some(s => s.type.includes('Organization'))) geoScore += 15;
  if (page.phones.length > 0) geoScore += 10;
  if (page.emails.length > 0) geoScore += 10;
  if (page.httpsRedirect === true) geoScore += 10;
  geoScore = Math.min(100, geoScore);

  // Общий: 30% тех + 25% контент + 25% AEO + 20% GEO
  const overallScore = Math.round(technicalScore * 0.30 + contentScore * 0.25 + aeoScore * 0.25 + geoScore * 0.20);

  // Roadmap: топ-5 правок (сортировка по impact/effort)
  const effortWeight = { low: 1, medium: 2, high: 3 } as const;
  const allItems: RoadmapItem[] = [];

  for (const issue of techIssues) {
    if (issue.severity === 'ok' || issue.severity === 'info') continue;
    allItems.push({
      rank: 0,
      title: issue.title,
      description: issue.recommendation,
      impact: issue.impact,
      effort: issue.effort,
      category: 'technical',
      pageUrl: page.url,
    });
  }

  if (page.aiAnalysis) {
    for (const fix of page.aiAnalysis.fixes) {
      allItems.push({
        rank: 0,
        title: fix.title,
        description: fix.rationale,
        impact: fix.impact,
        effort: fix.effort,
        category: 'content',
        pageUrl: page.url,
      });
    }
  }

  // Скоринг приоритета: impact / effort, чем выше — тем раньше
  allItems.sort((a, b) => {
    const scoreA = b.impact / effortWeight[b.effort];
    const scoreB = a.impact / effortWeight[a.effort];
    return scoreA - scoreB;
  });

  const roadmap = allItems.slice(0, 5).map((item, idx) => ({ ...item, rank: idx + 1 }));

  const topIssues = techIssues
    .filter((i) => i.severity === 'critical' || i.severity === 'warning')
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 8);

  const report: AuditReport = {
    id: `audit-${Date.now()}`,
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: new Date().toISOString(),
    targetUrl: page.url,
    overallScore,
    technicalScore,
    contentScore,
    aeoScore,
    geoScore,
    pages: [page],
    topIssues,
    roadmap,
  };

  return { report };
}

function serializeReportForChat(report: AuditReport): string {
  const page = report.pages[0];
  const lines: string[] = [];
  lines.push(`URL: ${page.url}`);
  lines.push(`Overall Score: ${report.overallScore}/100 (Tech: ${report.technicalScore}, Content: ${report.contentScore})`);
  lines.push(`Title: ${page.meta.title ?? '(отсутствует)'} (${page.meta.titleLength} симв.)`);
  lines.push(`Description: ${page.meta.description ?? '(отсутствует)'} (${page.meta.descriptionLength} симв.)`);
  lines.push(`Word count: ${page.wordCount}`);
  lines.push(`Headings: ${page.headings.length}`);
  lines.push(`Schemas found: ${page.schemas.length} (${page.schemas.filter((s) => s.valid).length} valid)`);
  lines.push(`Robots.txt: ${page.robotsTxtFound ? 'да' : 'нет'}, Sitemap.xml: ${page.sitemapXmlFound ? 'да' : 'нет'}`);
  lines.push(`Mobile-friendly: ${page.isMobileFriendly ? 'да' : 'нет'}`);
  lines.push(`--- TOP ISSUES ---`);
  for (const i of report.topIssues) {
    lines.push(`[${i.severity}] ${i.title} — impact=${i.impact}, effort=${i.effort}`);
  }
  lines.push(`--- ROADMAP TOP 5 ---`);
  for (const r of report.roadmap) {
    lines.push(`${r.rank}. ${r.title} (impact=${r.impact}, effort=${r.effort}, ${r.category})`);
  }
  if (page.aiAnalysis) {
    lines.push(`--- AI CONTENT ANALYSIS ---`);
    lines.push(`Intent: ${page.aiAnalysis.intent.detected} (match ${page.aiAnalysis.intent.matchScore}%)`);
    lines.push(`Summary: ${page.aiAnalysis.summary}`);
  }
  return lines.join('\n');
}

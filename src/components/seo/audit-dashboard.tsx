'use client';

import { useState } from 'react';
import { useSeoStore } from '@/lib/seo-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, StatusDot, SeverityBadge } from './seo-badges';
import { Hint } from './hint';
import {
  Download,
  RotateCcw,
  Bot,
  CheckCircle2,
  Wrench,
  ArrowRight,
  Search,
  Link as LinkIcon,
  FileText,
  Code2,
  Shield,
  ListTree,
  Copy,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TechIssue, PageAudit } from '@/lib/seo-types';

export function AuditDashboard({ onLeadClick }: { onLeadClick?: () => void }) {
  const { report, reset, toggleChat } = useSeoStore();
  const [exporting, setExporting] = useState(false);
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null);

  if (!report) return null;
  const page = report.pages[0];

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seo-audit-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string, fixId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFixId(fixId);
    setTimeout(() => setCopiedFixId(null), 1500);
  };

  const issuesBySeverity = {
    critical: page.issues.filter((i) => i.severity === 'critical'),
    warning: page.issues.filter((i) => i.severity === 'warning'),
    info: page.issues.filter((i) => i.severity === 'info'),
    ok: page.issues.filter((i) => i.severity === 'ok'),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Аудит завершён
          </div>
          <h1 className="mt-1 break-all text-lg font-bold sm:text-xl">{report.targetUrl}</h1>
          <p className="text-xs text-neutral-500">
            {new Date(report.completedAt).toLocaleString('ru-RU')} · {page.wordCount} слов · {page.headings.length} заголовков · {page.schemas.length} schema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => reset()} className="shrink-0">
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Новый</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="shrink-0">
            <Download className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{exporting ? 'PDF…' : 'PDF'}</span>
          </Button>
          <Button size="sm" onClick={() => toggleChat(true)} className="shrink-0 bg-neutral-900 text-white hover:bg-neutral-800">
            <Bot className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">AI</span>
          </Button>
        </div>
      </div>

      {/* Оценки */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreRing score={report.overallScore} size={100} label="Общий" />
        </Card>
        {[
          { label: 'Тех.', score: report.technicalScore },
          { label: 'Контент', score: report.contentScore },
          { label: 'AEO', score: report.aeoScore || 0 },
          { label: 'GEO', score: report.geoScore || 0 },
        ].map((s) => (
          <Card key={s.label} className="flex flex-col items-center justify-center p-4">
            <ScoreRing score={s.score} size={70} label={s.label} />
          </Card>
        ))}
      </div>

      {/* Превью Google */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Как сайт выглядит в Google</p>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500">
                {(() => { try { return new URL(page.url).hostname[0]?.toUpperCase() || 'S'; } catch { return 'S'; } })()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-neutral-500">{(() => { try { return new URL(page.url).hostname; } catch { return page.url; } })()}</p>
                <p className="truncate text-xs text-neutral-400">{page.url}</p>
              </div>
            </div>
            <h3 className="mt-1.5 text-base font-medium text-[#1a0dab] truncate">
              {page.meta.title || '(нет заголовка — Google возьмёт случайный текст)'}
            </h3>
            <p className="mt-0.5 text-sm text-[#4d5156] line-clamp-2">
              {page.meta.description || '(нет описания — Google покажет случайный кусок текста)'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap — топ-5 что делать */}
      {report.roadmap.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="bg-amber-500 px-5 py-3 text-white">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Wrench className="h-4 w-4" />
              Что сделать в первую очередь ({report.roadmap.length})
            </h2>
          </div>
          <ol className="divide-y">
            {report.roadmap.map((item) => (
              <li key={item.rank} className="flex gap-3 p-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  {item.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* AI-анализ контента */}
      {page.aiAnalysis && (
        <Card className="mt-6">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <Bot className="h-5 w-5 text-amber-600" />
                AI-анализ контента
              </h2>
              <ScoreRing score={page.aiAnalysis.contentScore} size={50} label="Контент" />
            </div>

            {page.aiAnalysis.summary && (
              <p className="text-sm text-neutral-700 rounded-lg bg-amber-50 p-3">{page.aiAnalysis.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-neutral-500">Поисковый интент</p>
                <p className="mt-1 text-sm font-medium">{page.aiAnalysis.intent.detected}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-neutral-500">Соответствие контента</p>
                <p className="mt-1 text-lg font-bold text-amber-600">{page.aiAnalysis.intent.matchScore}%</p>
              </div>
            </div>

            {page.aiAnalysis.intent.gaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-1.5">Что не хватает на странице:</p>
                <ul className="space-y-1">
                  {page.aiAnalysis.intent.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {page.aiAnalysis.fixes.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-neutral-500">Готовые правки от AI:</p>
                {page.aiAnalysis.fixes.map((fix, idx) => {
                  const fixId = 'fix-' + idx;
                  return (
                    <div key={idx} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-amber-100 text-amber-700">{fix.type}</Badge>
                        <p className="text-sm font-medium">{fix.title}</p>
                      </div>
                      {fix.before && (
                        <div className="mb-2">
                          <p className="text-xs text-neutral-400">Сейчас:</p>
                          <p className="text-sm text-red-600 line-through">{fix.before}</p>
                        </div>
                      )}
                      {fix.after && (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-neutral-400">Предлагается:</p>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => copyToClipboard(fix.after || '', fixId)}>
                              {copiedFixId === fixId ? <><Check className="mr-1 h-3 w-3 text-emerald-600" /> OK</> : <><Copy className="mr-1 h-3 w-3" /> Копировать</>}
                            </Button>
                          </div>
                          <pre className="mt-1 rounded bg-emerald-50 p-2 text-xs whitespace-pre-wrap dark:bg-emerald-950/20">{fix.after}</pre>
                        </div>
                      )}
                      {fix.rationale && <p className="mt-2 text-xs text-neutral-500">{fix.rationale}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Технические проверки — таблица */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-bold">Технические проверки</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Что проверили и что нашли</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="p-3 text-left font-medium text-neutral-500">Проверка</th>
                <th className="p-3 text-left font-medium text-neutral-500 w-20">Статус</th>
                <th className="p-3 text-left font-medium text-neutral-500">Что на сайте</th>
                <th className="p-3 text-left font-medium text-neutral-500">Как исправить</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {page.issues
                .filter(i => i.severity !== 'ok')
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 };
                  return order[a.severity] - order[b.severity];
                })
                .map((issue) => (
                  <tr key={issue.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-medium align-top">{issue.title}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <StatusDot severity={issue.severity} />
                        <SeverityBadge severity={issue.severity} showDot={false} />
                      </div>
                    </td>
                    <td className="p-3 text-neutral-600 align-top max-w-xs">
                      <p className="text-xs leading-relaxed">{issue.description}</p>
                    </td>
                    <td className="p-3 text-neutral-600 align-top max-w-xs">
                      {issue.recommendation ? (
                        <p className="text-xs leading-relaxed text-emerald-700">{issue.recommendation}</p>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {page.issues.filter(i => i.severity === 'ok').length > 0 && (
          <div className="border-t bg-emerald-50 px-5 py-3">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-emerald-700">
                ✅ Пройдено: {page.issues.filter(i => i.severity === 'ok').length} проверок
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {page.issues.filter(i => i.severity === 'ok').map(i => (
                  <span key={i.id} className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{i.title}</span>
                ))}
              </div>
            </details>
          </div>
        )}
      </Card>

      {/* Семантика */}
      {page.semanticCore && page.semanticCore.topKeywords.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b px-5 py-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><Search className="h-4 w-4 text-amber-600" /> Семантическое ядро</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{page.semanticCore.totalWords}</p>
                <p className="text-xs text-neutral-500">Слов всего</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{page.semanticCore.uniqueWords}</p>
                <p className="text-xs text-neutral-500">Уникальных</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{page.semanticCore.avgWordLength}</p>
                <p className="text-xs text-neutral-500">Средняя длина</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {page.semanticCore.topKeywords.map((kw, i) => (
                <span key={i} className="rounded-md border px-2.5 py-1 text-xs">
                  <span className="font-medium">{kw.word}</span>
                  <span className="ml-1.5 text-neutral-400">{kw.count}× ({kw.density}%)</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">{page.semanticCore.recommendation}</p>
          </div>
        </Card>
      )}

      {/* Читабельность */}
      {page.readability && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b px-5 py-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><FileText className="h-4 w-4 text-amber-600" /> Читабельность</h2>
          </div>
          <div className="p-5 flex items-center gap-6">
            <ScoreRing score={page.readability.score} size={80} label="Скор" />
            <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-lg font-bold">{page.readability.avgSentenceLength}</p>
                <p className="text-xs text-neutral-500">Слов/предл.</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{page.readability.avgWordLength}</p>
                <p className="text-xs text-neutral-500">Симв./слово</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{page.readability.longSentences}</p>
                <p className="text-xs text-neutral-500">Длинных предл.</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className={cn(
                  'text-sm',
                  page.readability.score >= 80 && 'border-emerald-300 text-emerald-700',
                  page.readability.score >= 50 && page.readability.score < 80 && 'border-amber-300 text-amber-700',
                  page.readability.score < 50 && 'border-red-300 text-red-700',
                )}>{page.readability.level}</Badge>
              </div>
            </div>
          </div>
          <div className="border-t px-5 py-3 text-sm text-neutral-600">{page.readability.recommendation}</div>
        </Card>
      )}

      {/* Внутренние ссылки */}
      {page.internalLinkStructure && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b px-5 py-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><LinkIcon className="h-4 w-4 text-amber-600" /> Внутренние ссылки</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{page.internalLinkStructure.totalLinks}</p>
                <p className="text-xs text-neutral-500">Всего</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{page.internalLinkStructure.uniqueTargets}</p>
                <p className="text-xs text-neutral-500">Уникальных URL</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-red-600">{page.internalLinkStructure.nofollowCount}</p>
                <p className="text-xs text-neutral-500">nofollow</p>
              </div>
            </div>
            {page.internalLinkStructure.topAnchors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-500 mb-2">Топ анкоров:</p>
                {page.internalLinkStructure.topAnchors.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                    <span className="truncate">{a.text}</span>
                    <span className="ml-2 shrink-0 text-xs text-neutral-400">{a.count}×</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-neutral-500">{page.internalLinkStructure.recommendation}</p>
          </div>
        </Card>
      )}

      {/* CTA */}
      <div className="mt-8 rounded-2xl bg-neutral-900 p-6 text-white">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Дальше</p>
            <h3 className="mt-2 font-display text-xl font-bold">Хотите, чтобы мы реализовали эти правки?</h3>
            <p className="mt-2 text-sm text-slate-300">SEO-специалисты Marketing Bureau возьмут сайт на ведение.</p>
          </div>
          <Button size="lg" onClick={onLeadClick} className="shrink-0 bg-amber-500 font-semibold text-white hover:bg-amber-600">
            Заказать →
          </Button>
        </div>
      </div>
    </div>
  );
}

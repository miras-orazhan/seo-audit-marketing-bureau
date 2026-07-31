'use client';

import { useState } from 'react';
import { useSeoStore } from '@/lib/seo-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, SeverityBadge, ImpactBar, EffortBadge } from './seo-badges';
import { Hint } from './hint';
import {
  Download,
  RotateCcw,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Info,
  Wrench,
  FileText,
  Shield,
  Code2,
  ListTree,
  MessageSquareQuote,
  Copy,
  Check,
  ArrowRight,
  Search,
  Link,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TechIssue, AIContentFix, PageAudit } from '@/lib/seo-types';

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Аудит завершён
          </div>
          <h1 className="mt-1 break-all text-lg font-bold sm:truncate sm:text-2xl">{report.targetUrl}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            <span className="block sm:inline">{new Date(report.completedAt).toLocaleString('ru-RU')}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">{page.wordCount} слов · {page.headings.length} заголовков · {page.schemas.length} schema</span>
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Button variant="outline" size="sm" onClick={() => reset()} className="shrink-0">
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Новый аудит</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="shrink-0">
            <Download className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{exporting ? 'Готовим PDF…' : 'Экспорт PDF'}</span>
          </Button>
          <Button size="sm" onClick={() => toggleChat(true)} className="shrink-0 bg-neutral-900 text-white hover:bg-neutral-800">
            <Bot className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Спросить AI</span>
          </Button>
        </div>
      </motion.div>

      {/* Score summary — PSI-стиль с 4 категориями */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4"
      >
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-5 sm:py-6">
            <ScoreRing score={report.overallScore} size={120} label="Overall" />
            <p className="mt-3 text-xs text-muted-foreground">Общий скор аудита</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
            <ScoreCard title="Technical" score={report.technicalScore} />
            <ScoreCard title="Content" score={report.contentScore} />
            <ScoreCard title="AEO" score={report.aeoScore || 0} />
            <ScoreCard title="GEO" score={report.geoScore || 0} />
            <MetricCard
              title="Критичных"
              value={issuesBySeverity.critical.length}
              tone="critical"
            />
            <MetricCard
              title="Предупреждений"
              value={issuesBySeverity.warning.length}
              tone="warning"
            />
            <MetricCard title="Инфо" value={issuesBySeverity.info.length} tone="info" />
            <MetricCard title="OK" value={issuesBySeverity.ok.length} tone="ok" />
            <MetricCard title="Время ответа" value={`${page.loadTimeMs} мс`} />
            <MetricCard title="Размер HTML" value={`${page.responseSizeKb} KB`} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Roadmap */}
      {report.roadmap.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-amber-500 text-white">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-white" />
                Roadmap: топ-{report.roadmap.length} правок «сделай в первую очередь»
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ol className="divide-y">
                {report.roadmap.map((item) => (
                  <li key={item.rank} className="flex gap-3 p-4 sm:gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                      {item.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {item.category === 'technical' ? 'техническая' : 'контентная'}
                        </Badge>
                        <EffortBadge effort={item.effort} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <div className="mt-2 sm:hidden">
                        <ImpactBar impact={item.impact} />
                      </div>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                      <ImpactBar impact={item.impact} />
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs: detailed */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <Tabs defaultValue="ai">
          <TabsList className="flex w-full justify-start overflow-x-auto gap-1 whitespace-nowrap rounded-lg p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="ai" className="gap-1.5 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              AI-правки
            </TabsTrigger>
            <TabsTrigger value="tech" className="gap-1.5 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
              Тех. ({issuesBySeverity.critical.length + issuesBySeverity.warning.length})
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-1.5 shrink-0">
              <FileText className="h-3.5 w-3.5" />
              Мета
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5 shrink-0">
              <Code2 className="h-3.5 w-3.5" />
              Schema ({page.schemas.length})
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 shrink-0">
              <Shield className="h-3.5 w-3.5" />
              Security
            </TabsTrigger>
            <TabsTrigger value="headings" className="gap-1.5 shrink-0">
              <ListTree className="h-3.5 w-3.5" />
              H1–H6 ({page.headings.length})
            </TabsTrigger>
            <TabsTrigger value="semantic" className="gap-1.5 shrink-0">
              <Search className="h-3.5 w-3.5" />
              Семантика
            </TabsTrigger>
            <TabsTrigger value="readability" className="gap-1.5 shrink-0">
              <FileText className="h-3.5 w-3.5" />
              Читабельность
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5 shrink-0">
              <Link className="h-3.5 w-3.5" />
              Ссылки
            </TabsTrigger>
          </TabsList>

          {/* AI-правки */}
          <TabsContent value="ai" className="mt-4 space-y-3">
            {page.aiAnalysis ? (
              <>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="flex items-center gap-2 font-semibold">
                          <MessageSquareQuote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Анализ интента
                        </h3>
                        <p className="mt-1 text-sm">
                          <span className="text-muted-foreground">Определённый интент:</span>{' '}
                          <span className="font-medium">{page.aiAnalysis.intent.detected}</span>
                        </p>
                        <p className="mt-1 text-sm">
                          <span className="text-muted-foreground">Соответствие контента:</span>{' '}
                          <span
                            className={cn(
                              'font-bold',
                              page.aiAnalysis.intent.matchScore >= 70
                                ? 'text-emerald-600'
                                : page.aiAnalysis.intent.matchScore >= 40
                                  ? 'text-amber-600'
                                  : 'text-red-600',
                            )}
                          >
                            {page.aiAnalysis.intent.matchScore}%
                          </span>
                        </p>
                        {page.aiAnalysis.intent.gaps.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Пробелы в покрытии темы:</p>
                            <ul className="mt-1 list-disc pl-5 text-sm">
                              {page.aiAnalysis.intent.gaps.map((g, i) => (
                                <li key={i}>{g}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <ScoreRing score={page.aiAnalysis.contentScore} size={80} label="Content" />
                    </div>
                    {page.aiAnalysis.summary && (
                      <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                        {page.aiAnalysis.summary}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="px-1 text-sm font-medium text-muted-foreground">
                    Готовые правки ({page.aiAnalysis.fixes.length})
                  </h3>
                  {page.aiAnalysis.fixes.map((fix) => (
                    <AIFixCard
                      key={fix.title}
                      fix={fix}
                      onCopy={() => copyToClipboard(fix.after || fix.before || '', fix.title)}
                      copied={copiedFixId === fix.title}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  AI-анализ недоступен для этой страницы.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Технические проблемы */}
          <TabsContent value="tech" className="mt-4">
            <div className="space-y-2">
              {page.issues
                .filter((i) => i.severity !== 'ok')
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 };
                  return order[a.severity] - order[b.severity] || b.impact - a.impact;
                })
                .map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              {page.issues.filter((i) => i.severity !== 'ok').length === 0 && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-6 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Технических проблем не найдено!</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Мета-теги */}
          <TabsContent value="meta" className="mt-4">
            <Card>
              <CardContent className="divide-y p-0">
                <MetaRow label="Title" value={page.meta.title} length={page.meta.titleLength} ideal="50–65" />
                <MetaRow
                  label="Description"
                  value={page.meta.description}
                  length={page.meta.descriptionLength}
                  ideal="140–160"
                />
                <MetaRow label="Canonical" value={page.meta.canonical} />
                <MetaRow label="og:title" value={page.meta.ogTitle} />
                <MetaRow label="og:description" value={page.meta.ogDescription} />
                <MetaRow label="og:image" value={page.meta.ogImage} />
                <MetaRow label="og:type" value={page.meta.ogType} />
                <MetaRow label="og:url" value={page.meta.ogUrl} />
                <MetaRow label="twitter:card" value={page.meta.twitterCard} />
                <MetaRow label="Favicon" value={page.meta.favicon} bool={!!page.meta.favicon} />
                <MetaRow label="Apple Touch Icon" value={page.meta.appleTouchIcon} bool={!!page.meta.appleTouchIcon} />
                <MetaRow label="Theme Color" value={page.meta.themeColor} bool={!!page.meta.themeColor} />
                <MetaRow label="robots" value={page.meta.robots} />
                <MetaRow label="lang" value={page.meta.language} />
                <MetaRow label="robots.txt" value={page.robotsTxtFound ? 'найден' : 'не найден'} bool={page.robotsTxtFound} />
                <MetaRow label="sitemap.xml" value={page.sitemapXmlFound ? 'найден' : 'не найден'} bool={page.sitemapXmlFound} />
                <MetaRow label="viewport" value={page.isMobileFriendly ? 'настроен' : 'отсутствует'} bool={page.isMobileFriendly} />
                <MetaRow
                  label="HTTP → HTTPS"
                  value={page.httpsRedirect === true ? 'редирект работает' : page.httpsRedirect === false ? 'нет редиректа' : 'HTTP недоступен'}
                  bool={page.httpsRedirect === true || page.httpsRedirect === null}
                  warn={page.httpsRedirect === false}
                />
                <MetaRow
                  label="ЧПУ URL"
                  value={page.urlStructure.isHumanReadable ? 'человекопонятный' : 'не ЧПУ'}
                  bool={page.urlStructure.isHumanReadable}
                  warn={!page.urlStructure.isHumanReadable}
                />
                <MetaRow label="Слов в контенте" value={String(page.wordCount)} />
                <MetaRow label="Внутренних ссылок" value={String(page.internalLinks)} />
                <MetaRow label="Внешних ссылок" value={String(page.externalLinks)} />
                <MetaRow label="Изображений" value={String(page.images.length)} />
                <MetaRow
                  label="Изображений без alt"
                  value={String(page.images.filter((i) => !i.alt).length)}
                  warn={page.images.filter((i) => !i.alt).length > 0}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schema */}
          <TabsContent value="schema" className="mt-4">
            <div className="space-y-3">
              {page.schemas.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center gap-3 p-6 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Structured data (JSON-LD) не найдена. Добавьте Organization / WebSite / BreadcrumbList schema.</span>
                  </CardContent>
                </Card>
              ) : (
                page.schemas.map((s, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{s.type}</span>
                        </div>
                        {s.valid ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Валидно
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Невалидно
                          </Badge>
                        )}
                      </div>
                      {s.errors && s.errors.length > 0 && (
                        <ul className="mt-2 text-xs text-red-600 dark:text-red-400">
                          {s.errors.map((e, j) => (
                            <li key={j}>• {e}</li>
                          ))}
                        </ul>
                      )}
                      <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                        <code>{s.raw}</code>
                      </pre>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="mt-4">
            <Card>
              <CardContent className="divide-y p-0">
                {[
                  ['Strict-Transport-Security', page.securityHeaders['strict-transport-security']],
                  ['Content-Security-Policy', page.securityHeaders['content-security-policy']],
                  ['X-Frame-Options', page.securityHeaders['x-frame-options']],
                  ['X-Content-Type-Options', page.securityHeaders['x-content-type-options']],
                  ['Referrer-Policy', page.securityHeaders['referrer-policy']],
                  ['Permissions-Policy', page.securityHeaders['permissions-policy']],
                ].map(([name, val]) => (
                  <MetaRow key={name} label={name} value={val || 'не установлен'} bool={!!val} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Заголовки */}
          <TabsContent value="headings" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {page.headings.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Заголовки не найдены.</p>
                ) : (
                  <div className="space-y-1.5">
                    {page.headings.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-[10px]',
                            h.level === 1 && 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400',
                          )}
                        >
                          H{h.level}
                        </Badge>
                        <span className="text-sm">{h.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Семантическое ядро */}
          <TabsContent value="semantic" className="mt-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Семантическое ядро</h3>
                  <Badge variant="outline">{page.semanticCore?.topKeywords.length || 0} ключевых слов</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{page.semanticCore?.totalWords || 0}</p>
                    <p className="text-xs text-muted-foreground">Всего слов</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{page.semanticCore?.uniqueWords || 0}</p>
                    <p className="text-xs text-muted-foreground">Уникальных</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{page.semanticCore?.avgWordLength || 0}</p>
                    <p className="text-xs text-muted-foreground">Средняя длина</p>
                  </div>
                </div>
                {page.semanticCore?.topKeywords && page.semanticCore.topKeywords.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Топ ключевых слов:</p>
                    <div className="flex flex-wrap gap-2">
                      {page.semanticCore.topKeywords.map((kw, i) => (
                        <span key={i} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs">
                          <span className="font-medium">{kw.word}</span>
                          <span className="ml-1.5 text-muted-foreground">{kw.count}× ({kw.density}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  → {page.semanticCore?.recommendation || 'Анализ недоступен.'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Читабельность */}
          <TabsContent value="readability" className="mt-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Читабельность текста</h3>
                  <Badge variant="outline" className={cn(
                    'text-sm',
                    (page.readability?.score || 0) >= 80 && 'border-emerald-300 text-emerald-700',
                    (page.readability?.score || 0) >= 50 && (page.readability?.score || 0) < 80 && 'border-amber-300 text-amber-700',
                    (page.readability?.score || 0) < 50 && 'border-red-300 text-red-700',
                  )}>
                    {page.readability?.level || '—'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <ScoreRing score={page.readability?.score || 0} size={80} label="Score" />
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold">{page.readability?.avgSentenceLength || 0}</p>
                      <p className="text-xs text-muted-foreground">Слов/предложение</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold">{page.readability?.avgWordLength || 0}</p>
                      <p className="text-xs text-muted-foreground">Символов/слово</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{page.readability?.longSentences || 0}</p>
                      <p className="text-xs text-muted-foreground">Длинных предложений</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  → {page.readability?.recommendation || 'Анализ недоступен.'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Внутренние ссылки */}
          <TabsContent value="links" className="mt-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Структура внутренних ссылок</h3>
                  <Badge variant="outline">{page.internalLinkStructure?.totalLinks || 0} ссылок</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{page.internalLinkStructure?.totalLinks || 0}</p>
                    <p className="text-xs text-muted-foreground">Всего ссылок</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{page.internalLinkStructure?.uniqueTargets || 0}</p>
                    <p className="text-xs text-muted-foreground">Уникальных URL</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{page.internalLinkStructure?.nofollowCount || 0}</p>
                    <p className="text-xs text-muted-foreground">nofollow</p>
                  </div>
                </div>
                {page.internalLinkStructure?.topAnchors && page.internalLinkStructure.topAnchors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Топ анкоров:</p>
                    <div className="space-y-1.5">
                      {page.internalLinkStructure.topAnchors.slice(0, 10).map((a, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                          <span className="truncate">{a.text}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{a.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  → {page.internalLinkStructure?.recommendation || 'Анализ недоступен.'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* CTA — заказать продвижение */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #FFD700 1px, transparent 1px), linear-gradient(to bottom, #FFD700 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-amber-500/20 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Дальше</p>
              <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">
                Хотите, чтобы мы реализовали эти правки за вас?
              </h3>
              <p className="mt-2 text-sm text-slate-100">
                SEO-специалисты Marketing Bureau возьмут сайт на полное ведение: техническая
                оптимизация, контент, ссылки, аналитика.
              </p>
            </div>
            <Button
              size="lg"
              onClick={onLeadClick}
              className="shrink-0 bg-amber-500 font-semibold text-white hover:bg-amber-600"
            >
              Заказать продвижение
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ScoreCard({ title, score }: { title: string; score: number }) {
  const color =
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', color)}>{score}</p>
      <p className="text-xs text-muted-foreground">из 100</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number | string;
  tone?: 'critical' | 'warning' | 'info' | 'ok';
}) {
  const toneClass = tone
    ? {
        critical: 'text-red-600 dark:text-red-400',
        warning: 'text-amber-600 dark:text-amber-400',
        info: 'text-blue-600 dark:text-blue-400',
        ok: 'text-emerald-600 dark:text-emerald-400',
      }[tone]
    : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', toneClass)}>{value}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: TechIssue }) {
  if (issue.severity === 'ok') return null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={issue.severity} />
              <h4 className="font-medium">{issue.title}</h4>
              <Badge variant="outline" className="text-[10px] capitalize">
                {issue.category}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
            {issue.recommendation && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-50 p-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{issue.recommendation}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <EffortBadge effort={issue.effort} />
            <ImpactBar impact={issue.impact} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIFixCard({
  fix,
  onCopy,
  copied,
}: {
  fix: AIContentFix;
  onCopy: () => void;
  copied: boolean;
}) {
  const typeLabels: Record<AIContentFix['type'], string> = {
    title: 'Title',
    description: 'Description',
    headings: 'Подзаголовки',
    content_block: 'Блок контента',
    faq_schema: 'FAQ Schema',
    internal_link: 'Внутренние ссылки',
    intent: 'Интент',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {typeLabels[fix.type]}
              </Badge>
              <h4 className="font-medium">{fix.title}</h4>
              <EffortBadge effort={fix.effort} />
            </div>

            {fix.before && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Сейчас:</p>
                <div className="mt-1 rounded-md border border-red-200 bg-red-50/50 p-2 text-sm text-foreground dark:border-red-900 dark:bg-red-950/20">
                  {fix.before}
                </div>
              </div>
            )}

            {fix.after && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Предлагается:</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onCopy}>
                    {copied ? (
                      <>
                        <Check className="mr-1 h-3 w-3 text-emerald-600" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        Копировать
                      </>
                    )}
                  </Button>
                </div>
                <pre className="mt-1 max-h-72 overflow-auto rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-xs whitespace-pre-wrap dark:border-emerald-900 dark:bg-emerald-950/20">
                  <code>{fix.after}</code>
                </pre>
              </div>
            )}

            {fix.rationale && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Info className="mr-1 inline h-3 w-3" />
                {fix.rationale}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <ImpactBar impact={fix.impact} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Словарь подсказок для меток во вкладке «Мета»
const META_LABEL_HINTS: Record<string, string> = {
  'Title': 'Заголовок страницы — виден в поиске и во вкладке браузера. 50-60 символов оптимально.',
  'Description': 'Описание для сниппета в поиске. 140-160 символов с целевым ключом и CTA.',
  'Canonical': 'Указывает поисковикам на основной URL страницы — защищает от дублей.',
  'og:title': 'Open Graph: заголовок для превью ссылки в WhatsApp, Telegram, VK, Facebook.',
  'og:description': 'Open Graph: описание превью ссылки в соцсетях.',
  'og:image': 'Open Graph: картинка превью ссылки в соцсетях (минимум 1200×630).',
  'og:type': 'Open Graph: тип страницы (website, article, product). Нужен для корректного превью.',
  'og:url': 'Open Graph: канонический URL страницы для соцсетей.',
  'twitter:card': 'Тип превью в Twitter/X: summary, summary_large_image, player и др.',
  'Favicon': 'Иконка сайта во вкладке браузера и в результатах поиска.',
  'Apple Touch Icon': 'Иконка при добавлении сайта на главный экран iPhone/iPad (180×180 PNG).',
  'Theme Color': 'Цвет адресной строки в Android Chrome — узнаваемость бренда на мобильных.',
  'robots': 'Инструкция для поисковых ботов: index/noindex, follow/nofollow.',
  'lang': 'Язык страницы (ru, en, kk) — помогает поисковикам и скринридерам.',
  'robots.txt': 'Файл с правилами для ботов: какие страницы сканировать можно, какие нельзя.',
  'sitemap.xml': 'Карта сайта в XML — помогает поисковикам быстрее найти все страницы.',
  'viewport': 'Мета-тег для корректного отображения на мобильных устройствах.',
  'HTTP → HTTPS': 'Автоматический редирект с http:// на https://. Защищает данные и нужен для SEO.',
  'ЧПУ URL': 'Человекопонятный URL: /uslugi/seo/ лучше, чем ?p=123. И для людей, и для поисковиков.',
  'Слов в контенте': 'Желательно 600-1500 слов для полноценного покрытия темы.',
};

function MetaRow({
  label,
  value,
  length,
  ideal,
  bool,
  warn,
}: {
  label: string;
  value: string | null | undefined;
  length?: number;
  ideal?: string;
  bool?: boolean;
  warn?: boolean;
}) {
  const hint = META_LABEL_HINTS[label];
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium text-muted-foreground">
        {hint ? (
          <Hint term={label} hint={hint} />
        ) : (
          label
        )}
      </div>
      <div className="flex items-center gap-2 text-right">
        <span
          className={cn(
            'max-w-md truncate text-sm',
            warn && 'text-amber-600 dark:text-amber-400',
            bool === false && 'text-red-600 dark:text-red-400',
            bool === true && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {value || '—'}
        </span>
        {length !== undefined && ideal && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {length} / {ideal}
          </span>
        )}
      </div>
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}

// Тип для пейдж-аудита нужен только чтобы подавить unused warning
export type _PageAudit = PageAudit;

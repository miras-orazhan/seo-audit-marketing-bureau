'use client';

import { useState } from 'react';
import { useSeoStore } from '@/lib/seo-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroForm({ onLeadClick }: { onLeadClick?: () => void }) {
  const { targetUrl, setTargetUrl, startScan, isScanning } = useSeoStore();
  const [input, setInput] = useState(targetUrl || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = input.trim();
    if (!url) return;
    setTargetUrl(url);
    await startScan(url);
  };

  return (
    <section className="relative overflow-hidden bg-neutral-900 text-white">
      {/* Декоративный фон: amber-свечение + тонкая сетка */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #F59E0B 1px, transparent 1px), linear-gradient(to bottom, #F59E0B 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
        />
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Левая колонка — заголовок и оффер */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Бесплатный AI SEO-аудит · без регистрации
            </div>

            <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              SEO-аудит сайта за{' '}
              <span className="text-amber-400">30 секунд</span>
              <br className="hidden sm:block" /> — готовые правки от AI
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base text-neutral-200 sm:text-lg">
              Вставьте адрес сайта — и через полминуты узнаете, что мешает вам подниматься в поиске Google.
              Не просто список ошибок, а понятные правки: что именно поменять и как.
            </p>

            {/* Trust bullets */}
            <ul className="mt-6 grid grid-cols-2 gap-y-2.5 gap-x-6 text-sm">
              {[
                'Без регистрации и SMS',
                'PDF-отчёт за 1 клик',
                '17+ технических проверок',
                'AI-анализ интента и контента',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-neutral-100">{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 hidden lg:block">
              <Button
                variant="outline"
                size="lg"
                onClick={onLeadClick}
                className="border-amber-500/40 bg-transparent text-amber-400 hover:bg-amber-500/10 hover:text-amber-400"
              >
                Заказать SEO-продвижение под ключ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Правая колонка — форма аудита */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            {/* Тонкая amber-рамка */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/40 via-transparent to-amber-500/20" />

            <div className="relative rounded-2xl border border-neutral-700 bg-white p-6 text-neutral-900 shadow-2xl sm:p-8">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-neutral-500">audit.marketingbureau.kz</span>
              </div>

              <h2 className="font-display text-2xl font-bold">Запустите аудит прямо сейчас</h2>
              <p className="mt-1.5 text-sm text-neutral-500">
                Введите адрес страницы — увидите полный отчёт через 30 секунд
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="example.kz или https://ваш-сайт.kz/page"
                    disabled={isScanning}
                    className="h-14 border-2 border-neutral-200 pl-10 pr-4 text-base focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isScanning || !input.trim()}
                  className="h-12 w-full bg-amber-500 text-base font-semibold text-white hover:bg-amber-600"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Анализируем…
                    </>
                  ) : (
                    <>
                      Запустить бесплатный аудит
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                <span>Поддерживаются сайты на любом движке</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                  Безопасно
                </span>
              </div>
            </div>

            {/* Превью-карточка снизу */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-neutral-700 bg-neutral-700 text-center text-xs"
            >
              {[
                { label: 'Тех. аудит', val: '17+ проверок' },
                { label: 'AI-контент', val: '7 правок' },
                { label: 'Скор', val: '0–100' },
              ].map((it) => (
                <div key={it.label} className="bg-neutral-900 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-amber-400">{it.label}</p>
                  <p className="mt-1 font-semibold text-white">{it.val}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function ScanProgress() {
  const { progress, targetUrl } = useSeoStore();

  if (progress.stage === 'idle' || progress.stage === 'done') return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              Аудит в процессе
            </div>
            <p className="mt-1 truncate font-medium">{targetUrl}</p>
          </div>
          <span className="font-display text-3xl font-extrabold tabular-nums text-amber-600">
            {progress.percent}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
          <motion.div
            className="h-full rounded-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <p className="mt-3 text-sm text-neutral-600">{progress.message}</p>

        {progress.stage === 'error' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Не удалось выполнить аудит</p>
              <p className="mt-0.5 text-xs opacity-90">{progress.message}</p>
              <p className="mt-1 text-xs opacity-75">
                Проверьте URL или попробуйте другой сайт. Если проблема повторяется —
                напишите нам, поможем вручную.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

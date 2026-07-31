'use client';

import { useRef, useState, useEffect } from 'react';
import { useSeoStore } from '@/lib/seo-store';
import { HeroForm, ScanProgress } from '@/components/seo/hero-form';
import { AuditDashboard } from '@/components/seo/audit-dashboard';
import { ChatPanel } from '@/components/seo/chat-panel';
import { LeadFormSection } from '@/components/seo/lead-form';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface ServiceItem { title: string; description: string }
interface FaqItem { q: string; a: string }
interface SiteSettings { [key: string]: string }
interface StatsData { auditsTotal: number; leadsTotal: number; uniqueSitesAnalyzed: number }

export default function Home() {
  const { report, isScanning, progress } = useSeoStore();
  const leadRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [stats, setStats] = useState<StatsData>({ auditsTotal: 0, leadsTotal: 0, uniqueSitesAnalyzed: 0 });

  // Загружаем динамический контент при монтировании
  useEffect(() => {
    fetch('/api/content').then(r => r.json()).then(data => {
      if (data.services) setServices(data.services);
      if (data.faqs) setFaqs(data.faqs);
      if (data.settings) setSettings(data.settings);
    }).catch(() => {});
    fetch('/api/stats').then(r => r.json()).then(data => {
      if (data.auditsTotal !== undefined) setStats(data);
    }).catch(() => {});
  }, []);

  const showHero = !report && !isScanning;
  const showProgress = isScanning || progress.stage === 'error';
  const showDashboard = !!report;

  const scrollToLead = () => {
    leadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-neutral-50 text-neutral-900">
      {/* Top nav — amber как в оригинальном marketingbureau.kz */}
      <header className="sticky top-0 z-30 bg-amber-500 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center" aria-label="Marketing Bureau">
            <img
              src="/logo.png"
              alt="Marketing Bureau"
              className="h-8 w-auto shrink-0 sm:h-9"
              width={160}
              height={90}
            />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-amber-600 hover:text-white">Возможности</a>
            <a href="#how" className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-amber-600 hover:text-white">Как работает</a>
            <a href="#services" className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-amber-600 hover:text-white">Услуги</a>
            <a href="#cases" className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-amber-600 hover:text-white">Кейсы</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:+77756367832"
              className="hidden items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white sm:flex"
            >
              <Phone className="h-3.5 w-3.5" />
              +7(775)636 78 32
            </a>
            <Button
              size="sm"
              onClick={scrollToLead}
              className="bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <span className="hidden sm:inline">Заказать продвижение</span>
              <span className="sm:hidden">Продвижение</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {showHero && (
          <>
            <HeroForm onLeadClick={scrollToLead} />
            <StatsBar settings={settings} stats={stats} />
            <FeaturesSection />
            <HowItWorksSection />
            <ServicesSection services={services} onLeadClick={scrollToLead} />
            <AuditCounter stats={stats} />
            <FaqSection faqs={faqs} />
          </>
        )}
        {showProgress && <ScanProgress />}
        {showDashboard && <AuditDashboard onLeadClick={scrollToLead} />}
        {/* Лид-форма всегда доступна внизу страницы — и на лендинге, и в дашборде */}
        <div ref={leadRef}>
          <LeadFormSection />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900 text-neutral-300">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center">
                <img
                  src="/logo-footer.png"
                  alt="Marketing Bureau"
                  className="h-9 w-auto"
                  width={180}
                  height={101}
                />
              </div>
              <p className="mt-4 max-w-md text-sm text-neutral-400">
                Маркетинговое агентство полного цикла. SEO-продвижение, контекстная реклама,
                SMM, веб-разработка и аналитика для бизнеса в Казахстане и СНГ.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Услуги</h4>
              <ul className="mt-3 space-y-1.5 text-sm text-neutral-400">
                <li>SEO-продвижение</li>
                <li>Контекстная реклама</li>
                <li>SMM и таргет</li>
                <li>Веб-разработка</li>
                <li>Веб-аналитика</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Контакты</h4>
              <ul className="mt-3 space-y-1.5 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-amber-500" /> +7(775)636 78 32
                </li>
                <li>marketingbureau.kz@gmail.com</li>
                <li>marketingbureau.kz</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-neutral-800 pt-6 text-xs text-neutral-500">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              <p>© 2026 Marketing Bureau. Все права защищены.</p>
              <p>
                Бесплатный AI SEO-аудит — сервис{' '}
                <a href="https://marketingbureau.kz" className="font-medium text-amber-500 hover:underline">
                  marketingbureau.kz
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      <ChatPanel />
    </div>
  );
}

// ============================================================
// Секции лендинга — минималистичный чёрно-золотой стиль
// ============================================================

function StatsBar({ settings, stats }: { settings: SiteSettings; stats: StatsData }) {
  const items = [
    { value: settings.projectsCount || '200+', label: 'проектов с ' + (settings.foundingYear || '2017') },
    { value: (settings.yearsExperience || '9') + ' лет', label: 'на рынке Казахстана' },
    { value: 'Топ-10', label: 'Google за ' + (settings.avgTimeToTop || '4') + ' мес' },
    { value: settings.trafficGrowth || 'x3.2', label: 'средний рост трафика' },
  ];
  return (
    <section className="border-y border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="border-l-2 border-amber-500 pl-4"
            >
              <p className="font-display text-3xl font-extrabold tracking-tight text-neutral-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: 'Технический SEO-аудит',
      text: '17+ проверок: статус-коды, редиректы, дубли мета-тегов, canonical, schema.org, robots.txt, sitemap, security-заголовки, мобильная адаптивность, alt изображений.',
      tags: ['Canonical', 'Schema.org', 'Mobile', 'Security'],
    },
    {
      title: 'AI-анализ контента',
      text: 'AI определяет поисковый интент, оценивает соответствие контента и генерирует правки: переписанные title и description, H2/H3, готовую FAQ-schema JSON-LD.',
      tags: ['Intent', 'Title rewrite', 'FAQ schema', 'Gaps'],
    },
    {
      title: 'Приоритизация и roadmap',
      text: 'Скор 0–100 и roadmap из топ-5 правок по impact/effort. Не 200 строк проблем — а план действий для разработчика. Экспорт в PDF.',
      tags: ['Score 0–100', 'Roadmap топ-5', 'Impact/Effort', 'PDF экспорт'],
    },
  ];

  return (
    <section id="features" className="py-14 sm:py-20 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Возможности</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Не просто список проблем —{' '}
            <span className="text-amber-600">готовые правки</span>
          </h2>
          <p className="mt-4 text-pretty text-base text-neutral-600 sm:text-lg">
            Ahrefs находит 200 проблем. Marketing Bureau — 5 правок, которые сделать первыми, с
            готовым кодом для вставки.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative bg-white p-6 transition-colors hover:bg-amber-50"
            >
              <span className="font-mono text-sm font-bold text-amber-600">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.text}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      title: 'Вставьте URL сайта',
      text: 'Введите URL. Краулер проверит мета-теги, canonical, schema.org, robots.txt, sitemap, security-заголовки и соберёт контент страницы.',
    },
    {
      n: '02',
      title: 'AI анализирует контент',
      text: 'AI определяет интент, оценивает контент в % и генерирует правки: title, description, H2/H3 и FAQ-schema JSON-LD.',
    },
    {
      n: '03',
      title: 'Получите roadmap',
      text: 'Скор 0–100 и топ-5 правок по приоритету. Экспорт в PDF, чат-ассистент по отчёту.',
    },
  ];
  return (
    <section id="how" className="border-y border-neutral-200 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Процесс</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Как это работает
          </h2>
          <p className="mt-4 text-base text-neutral-600 sm:text-lg">
            Три шага от URL до готового плана SEO-оптимизации
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <span className="font-display font-mono text-6xl font-extrabold text-amber-500/40">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection({ services, onLeadClick }: { services: ServiceItem[]; onLeadClick?: () => void }) {
  const fallback = [
    { title: 'SEO-продвижение', description: 'Выводим в топ-10 Google и Яндекс.' },
    { title: 'Контекстная реклама', description: 'Google Ads и Яндекс.Директ.' },
    { title: 'SMM и таргет', description: 'Instagram, Facebook, TikTok.' },
    { title: 'Веб-разработка', description: 'Сайты на Tilda, Webflow, Next.js.' },
    { title: 'Веб-аналитика', description: 'Google Analytics 4, GTM.' },
    { title: 'Полный SEO-аудит', description: 'Глубокий разбор с планом правок.' },
  ];
  const items = services.length > 0 ? services : fallback;
  return (
    <section id="services" className="py-14 sm:py-20 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Услуги агентства</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Полный цикл услуг{' '}
            <span className="text-amber-600">Marketing Bureau</span>
          </h2>
          <p className="mt-4 text-pretty text-base text-neutral-600 sm:text-lg">
            Бесплатный SEO-аудит — это первый шаг. Если нужна полноценная работа под ключ —
            у нас есть всё: от семантики до веб-разработки.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-amber-500"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-bold">{s.title}</h3>
              </div>
              <p className="mt-2 flex-1 text-sm text-neutral-600">{s.description}</p>
              <div className="mt-4 flex items-center justify-end border-t border-neutral-100 pt-3">
                <button
                  onClick={onLeadClick}
                  className="text-sm font-medium text-neutral-900 transition group-hover:gap-2"
                >
                  Заказать →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuditCounter({ stats }: { stats: StatsData }) {
  const items = [
    { value: String(stats.auditsTotal || 0), label: 'аудитов проведено' },
    { value: String(stats.uniqueSitesAnalyzed || 0), label: 'уникальных сайтов проверено' },
    { value: String(stats.leadsTotal || 0), label: 'заявок получено' },
  ];
  return (
    <section id="stats" className="border-y border-neutral-200 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Статистика</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Живые цифры — обновляются в реальном времени
          </h2>
          <p className="mt-4 text-base text-neutral-600 sm:text-lg">
            Каждый аудит и заявка автоматически попадают в базу данных
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {items.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-8"
            >
              <span className="font-display text-5xl font-extrabold text-amber-600">{s.value}</span>
              <span className="mt-2 text-sm text-neutral-600">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FAQ-секция — для SEO (расширенные сниппеты Google) и GEO/AEO
// (AI-системы цитируют ответы напрямую). Соответствует FAQPage
// schema.org, подключённой в StructuredData.
// ============================================================
function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  const fallback: FaqItem[] = [
    { q: 'Что такое SEO-аудит?', a: 'Технический и контентный анализ сайта для выявления проблем ранжирования.' },
    { q: 'Сколько стоит?', a: 'AI-аудит бесплатный. Полный аудит — от 90 000 ₸.' },
  ];
  const items = faqs.length > 0 ? faqs : fallback;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-14 sm:py-20 bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Частые вопросы
          </h2>
          <p className="mt-4 text-base text-neutral-600 sm:text-lg">
            Короткие ответы на главные вопросы про SEO и AI-аудит
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {items.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openIdx === idx}
              >
                <h3 className="text-base font-bold">{faq.q}</h3>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-amber-600 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}
                />
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-5">
                  <p className="text-sm leading-relaxed text-neutral-600">{faq.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-neutral-600">Остались вопросы?</p>
          <Button
            size="lg"
            className="mt-3 bg-neutral-900 text-white hover:bg-neutral-800"
            onClick={() => document.getElementById('lead')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Получить бесплатную консультацию
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

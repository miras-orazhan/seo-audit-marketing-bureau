// ============================================================
// Structured Data (JSON-LD) для SEO и GEO/AEO
// Помогает Google показывать расширенные сниппеты, а AI-системам
// (ChatGPT, Perplexity, Claude, Google AI Overviews) — цитировать
// контент и понимать суть страницы.
// ============================================================

const BASE_URL = 'https://audit.marketingbureau.kz';

// Organization — основная информация о компании
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'Marketing Bureau',
  alternateName: 'Marketing Bureau Kazakhstan',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: `${BASE_URL}/logo.png`,
  description:
    'Маркетинговое агентство полного цикла. SEO-продвижение, контекстная реклама, SMM, веб-разработка и аналитика для бизнеса в Казахстане и СНГ. Работаем с 2017 года.',
  foundingDate: '2017',
  foundingLocation: {
    '@type': 'Place',
    name: 'Алматы, Казахстан',
  },
  email: 'marketingbureau.kz@gmail.com',
  telephone: '+7-775-636-78-32',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'KZ',
    addressRegion: 'Алматинская область',
    addressLocality: 'Алматы',
  },
  areaServed: [
    { '@type': 'Country', name: 'Казахстан' },
    { '@type': 'Country', name: 'СНГ' },
  ],
  knowsLanguage: ['ru', 'kk', 'en'],
  sameAs: [
    'https://audit.marketingbureau.kz',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: '+7-775-636-78-32',
      email: 'marketingbureau.kz@gmail.com',
      availableLanguage: ['ru', 'kk'],
    },
  ],
};

// WebSite — для поиска по сайту + entity-узнавание
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  url: BASE_URL,
  name: 'Marketing Bureau — SEO-аудит и продвижение сайтов',
  alternateName: 'Marketing Bureau SEO Lens',
  description:
    'Бесплатный AI SEO-аудит сайта за 30 секунд: технические проверки, анализ контента, приоритизированные правки от AI. Продвижение сайтов в Google и Яндекс.',
  inLanguage: 'ru-KZ',
  publisher: { '@id': `${BASE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// WebPage — конкретная страница (главная)
const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE_URL}/#webpage`,
  url: BASE_URL,
  name: 'SEO-аудит сайта бесплатно за 30 секунд — Marketing Bureau',
  description:
    'Бесплатный AI SEO-аудит вашего сайта: 17+ технических проверок, анализ контента, переписанные title и description, готовая FAQ-schema, приоритизированный roadmap. Продвижение сайтов в Казахстане с 2017 года.',
  inLanguage: 'ru-KZ',
  isPartOf: { '@id': `${BASE_URL}/#website` },
  about: {
    '@type': 'Thing',
    name: 'SEO-аудит и поисковое продвижение сайтов',
  },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/logo.png`,
  },
  publisher: { '@id': `${BASE_URL}/#organization` },
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString().split('T')[0],
};

// FAQPage — для AI Overviews и расширенных сниппетов Google
// AI-системы обожают FAQ: они цитируют ответы напрямую
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${BASE_URL}/#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Что такое SEO-аудит сайта и зачем он нужен?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SEO-аудит — технический и контентный анализ сайта для выявления проблем, мешающих ранжированию в Google и Яндекс. Включает проверку мета-тегов, заголовков, canonical, schema.org, скорости, мобильной адаптивности и соответствия контента поисковому интенту.',
      },
    },
    {
      '@type': 'Question',
      name: 'Сколько стоит SEO-аудит сайта?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Базовый AI SEO-аудит на сайте Marketing Bureau (audit.marketingbureau.kz) — бесплатный и не требует регистрации. Полный ручной SEO-аудит с отчётом на 40+ страниц и планом правок стоит от 90 000 тенге. Стоимость SEO-продвижения под ключ — от 150 000 тенге в месяц и зависит от ниши, региона и конкуренции.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как работает AI SEO-аудит?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI-аудит: краулер проверяет 17+ технических параметров, AI анализирует контент и интент, генерирует правки (title, description, H2/H3, FAQ-schema). Алгоритм считает скор 0–100 и строит roadmap из топ-5 правок. Отчёт готов за 30 секунд.',
      },
    },
    {
      '@type': 'Question',
      name: 'Что такое GEO и AEO оптимизация?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GEO и AEO — оптимизация для AI-поиска (Google AI Overviews, ChatGPT, Perplexity). В отличие от SEO, GEO фокусируется на структурированных данных, чётких ответах и фактах. Цель — чтобы AI цитировал ваш контент.',
      },
    },
    {
      '@type': 'Question',
      name: 'Сколько времени занимает SEO-продвижение?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Первые результаты — через 2–3 месяца. Топ-10 Google — через 4–6 месяцев. Стабильный трафик — через 6–12 месяцев. Marketing Bureau с 2017 года выводит сайты в топ-10 Google за 4 месяца в среднем.',
      },
    },
    {
      '@type': 'Question',
      name: 'Чем SEO отличается от контекстной рекламы?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SEO — органическая выдача: не платите за клики, результат сохраняется. Контекстная реклама (Google Ads, Яндекс.Директ) — платные объявления: мгновенный результат, исчезает без бюджета. Комбинируйте: реклама для старта, SEO для потока.',
      },
    },
    {
      '@type': 'Question',
      name: 'Какие услуги предоставляет Marketing Bureau?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Marketing Bureau — агентство полного цикла с 2017 года. Услуги: SEO, контекстная реклама (Google Ads, Яндекс.Директ), SMM (Instagram, TikTok), веб-разработка, аналитика (GA4, GTM). 200+ проектов, топ-10 Google за 4 месяца.',
      },
    },
    {
      '@type': 'Question',
      name: 'В каких регионах работает Marketing Bureau?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Marketing Bureau работает по всему Казахстану (Алматы, Астана, Шымкент, Караганда, Актобе и другие города) и странам СНГ. Основной офис — в Алматы. Связаться можно по телефону +7 (775) 636 78 32 или email marketingbureau.kz@gmail.com. Консультация — бесплатная.',
      },
    },
  ],
};

// BreadcrumbList — навигационные хлебные крошки
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  '@id': `${BASE_URL}/#breadcrumb`,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Главная',
      item: BASE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'SEO-аудит',
      item: `${BASE_URL}/#audit`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Услуги',
      item: `${BASE_URL}/#services`,
    },
  ],
};

// Service — конкретная услуга (SEO-аудит)
const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${BASE_URL}/#service-seo-audit`,
  name: 'Бесплатный AI SEO-аудит сайта',
  description:
    'Полный SEO-аудит сайта за 30 секунд: 17+ технических проверок, AI-анализ контента, переписанные мета-теги, готовая FAQ-schema, приоритизированный roadmap правок.',
  provider: { '@id': `${BASE_URL}/#organization` },
  serviceType: 'SEO-аудит',
  areaServed: [
    { '@type': 'Country', name: 'Казахстан' },
    { '@type': 'Country', name: 'СНГ' },
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KZT',
    description: 'Бесплатно, без регистрации',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '47',
    bestRating: '5',
    worstRating: '1',
  },
};

// HowTo — пошаговая инструкция (для AI и расширенных сниппетов)
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${BASE_URL}/#howto`,
  name: 'Как запустить бесплатный SEO-аудит сайта',
  description:
    'Три шага, чтобы получить полный SEO-отчёт с приоритизированными правками от AI.',
  totalTime: 'PT30S',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Вставьте URL сайта',
      text: 'Введите адрес главной страницы или конкретного URL в форму аудита. Краулер загрузит HTML и проверит статус, мета-теги, canonical, schema.org, security-заголовки, robots.txt и sitemap.xml.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'AI анализирует контент',
      text: 'AI-модель определяет поисковый интент страницы, оценивает соответствие контента, находит пробелы в теме и генерирует конкретные правки: переписанный title и description, H2/H3 подзаголовки, готовую FAQ-schema.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Получите roadmap',
      text: 'Скор 0-100 (60% технический + 40% контент) + приоритизированный список из топ-5 правок по impact/effort. Экспорт в PDF одним кликом. Чат-ассистент ответит на вопросы по отчёту.',
    },
  ],
};

// ProfessionalService — для LocalBusiness-сущности
const professionalServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${BASE_URL}/#professional-service`,
  name: 'Marketing Bureau',
  description:
    'Маркетинговое агентство полного цикла: SEO, контекстная реклама, SMM, веб-разработка, аналитика. Работаем с 2017 года.',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: `${BASE_URL}/logo.png`,
  telephone: '+7-775-636-78-32',
  email: 'marketingbureau.kz@gmail.com',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'KZ',
    addressLocality: 'Алматы',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '43.2220',
    longitude: '76.8512',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
  ],
  areaServed: { '@type': 'Country', name: 'Казахстан' },
  serviceType: [
    'SEO-продвижение',
    'Контекстная реклама',
    'SMM и таргет',
    'Веб-разработка',
    'Веб-аналитика',
  ],
};

// Все схемы вместе — для вставки в <head>
export const allSchemas = [
  organizationSchema,
  websiteSchema,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
  serviceSchema,
  howToSchema,
  professionalServiceSchema,
];

/**
 * Компонент для рендера всех JSON-LD схем в <head>.
 * Использование: <StructuredData /> в layout.tsx
 */
export function StructuredData() {
  return (
    <>
      {allSchemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // dangerouslySetInnerHTML — единственный способ вставить JSON-LD в Next.js
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

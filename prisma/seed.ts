import { db } from '../src/lib/db';

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // Услуги
  // ============================================================
  const services = [
    { title: 'SEO-продвижение', description: 'Выводим в топ-10 Google и Яндекс. Технический аудит, семантика, контент, линкбилдинг.', order: 1 },
    { title: 'Контекстная реклама', description: 'Google Ads и Яндекс.Директ. Настройка, ведение, оптимизация ROI под ваш бюджет.', order: 2 },
    { title: 'SMM и таргет', description: 'Instagram, Facebook, TikTok. Контент-стратегия, таргетинг, community management.', order: 3 },
    { title: 'Веб-разработка', description: 'Сайты на Tilda, Webflow, Next.js. Интернет-магазины, лендинги, корпоративные порталы.', order: 4 },
    { title: 'Веб-аналитика', description: 'Google Analytics 4, GTM, сквозная аналитика. Настройка целей, дашборды, отчёты.', order: 5 },
    { title: 'Полный SEO-аудит', description: 'Глубокий технический и контентный разбор сайта с отчётом на 40+ страниц и планом правок.', order: 6 },
  ];

  for (const s of services) {
    await db.service.upsert({
      where: { id: s.order },
      update: s,
      create: s,
    });
  }
  console.log(`✓ ${services.length} услуг добавлено`);

  // ============================================================
  // FAQ
  // ============================================================
  const faqs = [
    { question: 'Что такое SEO-аудит сайта и зачем он нужен?', answer: 'SEO-аудит — технический и контентный анализ сайта для выявления проблем, мешающих ранжированию в Google и Яндекс. Включает проверку мета-тегов, заголовков, canonical, schema.org, скорости, мобильной адаптивности и соответствия контента поисковому интенту.', order: 1 },
    { question: 'Сколько стоит SEO-аудит сайта?', answer: 'AI SEO-аудит на сайте Marketing Bureau — бесплатный и не требует регистрации. Полный ручной SEO-аудит с отчётом на 40+ страниц стоит от 90 000 ₸. SEO-продвижение под ключ — от 150 000 ₸/мес.', order: 2 },
    { question: 'Как работает AI SEO-аудит?', answer: 'Краулер проверяет 17+ технических параметров, AI анализирует контент и интент, генерирует правки (title, description, H2/H3, FAQ-schema). Алгоритм считает скор 0–100 и строит roadmap из топ-5 правок. Отчёт готов за 30 секунд.', order: 3 },
    { question: 'Что такое GEO и AEO оптимизация?', answer: 'GEO и AEO — оптимизация для AI-поиска (Google AI Overviews, ChatGPT, Perplexity). В отличие от SEO, GEO фокусируется на структурированных данных, чётких ответах и фактах. Цель — чтобы AI цитировал ваш контент.', order: 4 },
    { question: 'Сколько времени занимает SEO-продвижение?', answer: 'Первые результаты — через 2–3 месяца. Топ-10 Google — через 4–6 месяцев. Стабильный трафик — через 6–12 месяцев. Marketing Bureau с 2017 года выводит сайты в топ-10 Google за 4 месяца в среднем.', order: 5 },
    { question: 'Чем SEO отличается от контекстной рекламы?', answer: 'SEO — органическая выдача: не платите за клики, результат сохраняется. Контекстная реклама (Google Ads, Яндекс.Директ) — платные объявления: мгновенный результат, исчезает без бюджета. Комбинируйте: реклама для старта, SEO для потока.', order: 6 },
    { question: 'Какие услуги предоставляет Marketing Bureau?', answer: 'Marketing Bureau — агентство полного цикла с 2017 года. Услуги: SEO, контекстная реклама (Google Ads, Яндекс.Директ), SMM (Instagram, TikTok), веб-разработка, аналитика (GA4, GTM). 200+ проектов, топ-10 Google за 4 месяца.', order: 7 },
    { question: 'В каких регионах работает Marketing Bureau?', answer: 'Работаем по всему Казахстану (Алматы, Астана, Шымкент и др.) и странам СНГ. Офис в Алматы. Телефон: +7 (775) 636 78 32, email: marketingbureau.kz@gmail.com. Консультация — бесплатная.', order: 8 },
  ];

  for (const f of faqs) {
    await db.faqItem.upsert({
      where: { id: f.order },
      update: f,
      create: f,
    });
  }
  console.log(`✓ ${faqs.length} FAQ добавлено`);

  // ============================================================
  // Настройки сайта
  // ============================================================
  const settings = [
    { key: 'phone', value: '+7 (775) 636 78 32' },
    { key: 'phoneHref', value: '+77756367832' },
    { key: 'email', value: 'marketingbureau.kz@gmail.com' },
    { key: 'projectsCount', value: '200+' },
    { key: 'yearsExperience', value: '9' },
    { key: 'avgTimeToTop', value: '4' },
    { key: 'trafficGrowth', value: 'x3.2' },
    { key: 'foundingYear', value: '2017' },
    { key: 'siteUrl', value: 'https://audit.marketingbureau.kz' },
  ];

  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }
  console.log(`✓ ${settings.length} настроек добавлено`);

  // ============================================================
  // Админ-пользователь (пароль: admin123 — смените в проде!)
  // ============================================================
  const { createHash } = await import('node:crypto');
  const passwordHash = createHash('sha256').update('admin123').digest('hex');
  await db.adminUser.upsert({
    where: { email: 'admin@marketingbureau.kz' },
    update: { passwordHash },
    create: {
      email: 'admin@marketingbureau.kz',
      passwordHash,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log('✓ Админ-пользователь создан (admin@marketingbureau.kz / admin123)');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

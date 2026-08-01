import { db } from '../src/lib/db';

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // Услуги — только SEO/GEO/AEO
  // ============================================================
  const services = [
    { title: 'SEO-продвижение', description: 'Выводим в топ-10 Google и Яндекс. Технический аудит, семантическое ядро, контент, линкбилдинг, регулярный мониторинг позиций.', order: 1 },
    { title: 'GEO-оптимизация', description: 'Оптимизация под AI-поиск: Google AI Overviews, ChatGPT, Perplexity. Структурированные данные, entity-разметка, факты для цитирования.', order: 2 },
    { title: 'AEO-оптимизация', description: 'Оптимизация под Answer Engines: featured snippets, People Also Ask, голосовой поиск. FAQ-schema, прямые ответы, читабельность.', order: 3 },
    { title: 'Технический SEO-аудит', description: 'Глубокий технический разбор: 17+ проверок, canonical, schema.org, Core Web Vitals, security headers, мобильная адаптивность.', order: 4 },
    { title: 'Семантическое ядро', description: 'Сбор и кластеризация ключевых запросов, анализ интента, карта релевантности, контент-план под поисковые запросы.', order: 5 },
    { title: 'Контент-маркетинг', description: 'SEO-тексты под поисковые интенты, структура H1-H6, FAQ-разметка, оптимизация плотности ключевых слов.', order: 6 },
  ];

  // Удаляем старые услуги и создаём новые
  await db.service.deleteMany({});
  for (const s of services) {
    await db.service.create({ data: s });
  }
  console.log(`✓ ${services.length} услуг добавлено`);

  // ============================================================
  // FAQ — человеческим языком
  // ============================================================
  const faqs = [
    { question: 'Что такое SEO-аудит сайта и зачем он нужен?', answer: 'Это проверка сайта, которая показывает, почему он плохо виден в поиске Google или Яндекс — и что с этим делать. Мы смотрим на скорость загрузки, удобство на телефоне, правильность заголовков и на то, отвечает ли текст на сайте на вопросы, которые люди реально вводят в поиск.', order: 1 },
    { question: 'Сколько стоит SEO-аудит сайта?', answer: 'AI SEO-аудит на нашем сайте — бесплатный и не требует регистрации. Полный ручной SEO-аудит с отчётом на 40+ страниц стоит от 90 000 ₸. SEO-продвижение под ключ — от 150 000 ₸/мес.', order: 2 },
    { question: 'Как работает AI SEO-аудит?', answer: 'Программа загружает ваш сайт, проверяет 17+ технических параметров и собирает весь текст. AI читает контент как реальный посетитель: понимает, для чего страница нужна, оценивает качество текста и готовит правки — что изменить в заголовках и описаниях. Отчёт готов за 30 секунд.', order: 3 },
    { question: 'Что такое GEO и AEO оптимизация?', answer: 'GEO — оптимизация под нейросети (ChatGPT, Google AI, Perplexity), чтобы они цитировали ваш сайт. AEO — оптимизация под прямые ответы (featured snippets, голосовой поиск). Люди ищут по-разному: классический поиск, нейросети, голос — мы проверяем видимость во всех трёх.', order: 4 },
    { question: 'Сколько времени занимает SEO-продвижение?', answer: 'Первые результаты — через 2–3 месяца. Топ-10 Google — через 4–6 месяцев. Стабильный трафик — через 6–12 месяцев. Мы с 2017 года выводим сайты в топ-10 Google за 4 месяца в среднем.', order: 5 },
    { question: 'Чем SEO отличается от контекстной рекламы?', answer: 'SEO — органическая выдача: не платите за клики, результат сохраняется. Контекстная реклама — платные объявления: мгновенный результат, исчезает без бюджета. Комбинируйте: реклама для старта, SEO для долгосрочного потока.', order: 6 },
    { question: 'Какие услуги предоставляет Marketing Bureau?', answer: 'Мы занимаемся только поисковой оптимизацией: SEO-продвижение, GEO-оптимизация (под AI-поиск), AEO-оптимизация (под Answer Engines), технический аудит, семантическое ядро и контент-маркетинг. Работаем с 2017 года, 200+ проектов.', order: 7 },
    { question: 'В каких регионах работает Marketing Bureau?', answer: 'Работаем по всему Казахстану (Алматы, Астана, Шымкент и др.) и странам СНГ. Телефон: +7 (775) 636 78 32, email: marketingbureau.kz@gmail.com. Консультация — бесплатная.', order: 8 },
  ];

  await db.faqItem.deleteMany({});
  for (const f of faqs) {
    await db.faqItem.create({ data: f });
  }
  console.log(`✓ ${faqs.length} FAQ добавлено`);

  // ============================================================
  // Настройки сайта — домен audit.marketingbureau.kz
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

  await db.siteSetting.deleteMany({});
  for (const s of settings) {
    await db.siteSetting.create({ data: s });
  }
  console.log(`✓ ${settings.length} настроек добавлено`);

  // ============================================================
  // Админ-пользователь
  // ============================================================
  const { createHash } = await import('node:crypto');
  const passwordHash = createHash('sha256').update('admin123').digest('hex');
  await db.adminUser.upsert({
    where: { email: 'admin@marketingbureau.kz' },
    update: { passwordHash },
    create: { email: 'admin@marketingbureau.kz', passwordHash, name: 'Admin', role: 'admin' },
  });
  console.log('✓ Админ-пользователь создан');

  console.log('\n✅ Seed complete!');
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); }).finally(async () => { await db.$disconnect(); });

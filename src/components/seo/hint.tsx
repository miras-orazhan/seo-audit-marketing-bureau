'use client';

import { useState, ReactNode } from 'react';

interface HintProps {
  /** Термин, который видит пользователь */
  term: string;
  /** Текст подсказки при наведении */
  hint: string;
  /** Дополнительные классы для термина */
  className?: string;
}

/**
 * Подсказка при наведении на технический термин.
 * Чистый CSS hover (без Radix Tooltip), чтобы работало везде — в т.ч. в standalone HTML.
 */
export function Hint({ term, hint, className }: HintProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        className={`cursor-help border-b border-dashed border-current opacity-80 ${className || ''}`}
      >
        {term}
      </span>
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-normal leading-snug text-white shadow-xl"
        >
          {hint}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </span>
      )}
    </span>
  );
}

/** Словарь терминов с подсказками — для переиспользования в дашборде */
export const HINTS = {
  impact: 'Влияние этой правки на SEO — чем выше число (0-100), тем сильнее улучшит позиции в поиске.',
  effort: 'Трудозатраты на исправление: Легко = 5 минут, Средне = 1-2 часа, Сложно = нужен разработчик.',
  critical: 'Критическая проблема — срочно влияет на индексацию или доступность сайта.',
  warning: 'Внимание — проблема снижает позиции или ухудшает SEO, но не блокирует сайт.',
  info: 'Информация — улучшение, не обязательное к срочному исправлению.',
  ok: 'Проверка пройдена, всё в порядке.',
  canonical: 'Указывает поисковикам на основной URL страницы — защищает от дублей при разных ссылках.',
  schema: 'Structured data (JSON-LD) — разметка для расширенных сниппетов в Google (звёзды, FAQ, хлебные крошки).',
  h1: 'Главный заголовок страницы — должен быть один, с целевым ключевым словом.',
  ogTags: 'Open Graph — теги для красивых превью ссылки в WhatsApp, Telegram, VK, Facebook.',
  favicon: 'Иконка сайта во вкладке браузера и в результатах поиска.',
  appleTouchIcon: 'Иконка сайта при добавлении на главный экран iPhone/iPad (180×180 PNG).',
  themeColor: 'Цвет адресной строки в Android Chrome — узнаваемость бренда на мобильных.',
  httpsRedirect: 'Автоматический переход с http:// на https:// — защищает данные и нужен для SEO.',
  humanUrl: 'ЧПУ (человекопонятный URL) — /uslugi/seo/ вместо ?p=123. Лучше для людей и поисковиков.',
  viewport: 'Мета-тег для корректного отображения на мобильных устройствах.',
  robotsTxt: 'Файл, который говорит поисковым ботам, какие страницы можно сканировать.',
  sitemapXml: 'Карта сайта в XML — помогает поисковикам быстрее найти все страницы.',
  ttfb: 'Time To First Byte — время до первого байта. Чем меньше, тем быстрее сайт.',
  intent: 'Поисковый интент — что именно хочет найти человек по этому запросу (информация, товар, услуга).',
  contentScore: 'Оценка качества контента — насколько он полон, релевантен и соответствует интенту.',
} as const;

interface HintWithDefaultsProps {
  type: keyof typeof HINTS;
  term?: string;
  className?: string;
}

/** Хелпер: использовать подсказку из словаря по типу */
export function HintT({ type, term, className }: HintWithDefaultsProps) {
  return <Hint term={term || type} hint={HINTS[type]} className={className} />;
}

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

/** Универсальный tooltip — обёртка над любым контентом */
export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-normal leading-snug text-white shadow-xl"
        >
          {content}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </span>
      )}
    </span>
  );
}

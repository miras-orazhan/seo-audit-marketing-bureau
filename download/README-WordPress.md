# Инструкция: деплой Marketing Bureau SEO-аудита на WordPress

## Архитектура

```
[WordPress страница]              [Backend (Next.js API)]
   seo-audit.html         →        /api/audit
   (статичный HTML)       →        /api/analyze  (SSE)
                          →        /api/chat
                          →        /api/export   (PDF)
```

Фронтенд — один статичный HTML-файл (`seo-audit.html`), который можно разместить где угодно: на WordPress, в Tilda, на GitHub Pages, даже открыть локально.

Бэкенд — Next.js приложение, которое держит API routes и обращается к z-ai-web-dev-sdk для AI-анализа.

---

## Шаг 1. Деплой бэкенда

### Вариант A: Vercel (рекомендуется)

1. Залейте проект на GitHub
2. На [vercel.com](https://vercel.com) → New Project → импортируйте репозиторий
3. Vercel автоматически определит Next.js, деплой займёт ~1 минуту
4. Получите URL вида `https://marketing-bureau-seo.vercel.app`

### Вариант B: Собственный VPS

```bash
# На сервере с Node.js 20+:
git clone <ваш-репозиторий>
cd marketing-bureau-seo
npm install
npm run build
npm run start  # поднимется на порту 3000
```

Затем настройте Nginx/Caddy как reverse-proxy на домен `https://api.marketingbureau.kz`.

---

## Шаг 2. Размещение HTML на WordPress

### Вариант 1: Отдельная страница (рекомендуется)

1. Скопируйте файл `seo-audit.html` из папки `download/`
2. В WordPress админке: **Pages → Add New**
3. Заголовок: «SEO-аудит»
4. В редакторе выберите блок **Custom HTML** (или переключитесь на Code Editor)
5. Вставьте всё содержимое `seo-audit.html`
6. Опубликуйте страницу по адресу `/seo-audit/`

### Вариант 2: Через FTP/файл-менеджер

1. Зайдите по FTP в `/wp-content/uploads/` или в корень сайта
2. Загрузите `seo-audit.html`
3. Откройте по адресу `https://ваш-сайт.kz/seo-audit.html`

### Вариант 3: Поддомен (лучшая изоляция стилей)

1. Создайте поддомен `audit.marketingbureau.kz`
2. Залейте туда `seo-audit.html` (переименуйте в `index.html`)
3. Откройте `https://audit.marketingbureau.kz/`

---

## Шаг 3. Настройка BACKEND_URL в HTML

Откройте `seo-audit.html` в текстовом редакторе и найдите строку (ближе к концу файла, в блоке `<script>`):

```js
const BACKEND_URL = 'http://localhost:3000'; // ← ЗАМЕНИТЕ на свой домен
```

Замените на ваш домен бэкенда, например:

```js
const BACKEND_URL = 'https://marketing-bureau-seo.vercel.app';
```

или

```js
const BACKEND_URL = 'https://api.marketingbureau.kz';
```

Сохраните файл и перезалейте на WordPress.

---

## Шаг 4. Проверка CORS

Бэкенд уже настроен разрешать запросы с:
- `localhost` (для разработки)
- Любого `preview-*.space-z.ai` (для тестов)
- Любого поддомена `marketingbureau.kz`

Если ваш WordPress на другом домене — добавьте его в `src/middleware.ts`:

```ts
const ALLOWED_ORIGINS = [
  // ... существующие
  'https://ваш-домен.kz',
  /^https:\/\/.*\.ваш-домен\.kz$/,
];
```

И передеплойте бэкенд.

---

## Локальное тестирование

1. Запустите бэкенд:
   ```bash
   cd marketing-bureau-seo
   npm run dev  # поднимется на http://localhost:3000
   ```

2. Откройте файл `download/seo-audit.html` в браузере (двойным кликом)
   — он автоматически будет ходить на `http://localhost:3000`

3. Введите URL сайта и запустите аудит

---

## Что в HTML

- **Header** — логотип Marketing Bureau + навигация + CTA
- **Hero** — заголовок + форма ввода URL
- **Stats** — 200+ проектов, 8 лет, Топ-10, x3.2
- **Features** — 3 карточки возможностей
- **How it works** — 3 шага
- **Services** — 6 услуг с ценами (CTA → лид-форма)
- **Cases** — 3 кейса
- **Прогресс-бар** — показывается во время аудита
- **Dashboard** — после аудита: скор, roadmap, вкладки (AI-правки / Тех / Мета / Schema / Security / Заголовки)
- **CTA-баннер** — «Закажите продвижение»
- **Лид-форма** — имя, телефон, email, сайт, комментарий
- **Footer** — контакты
- **Чат-ассистент** — плавающая кнопка справа внизу

Все стили на Tailwind CDN (с конфигом брендовых цветов), весь JS инлайн — файл самодостаточный.

---

## Известные ограничения

- **Tailwind CDN** подгружается с `cdn.tailwindcss.com` — нужен интернет. Если WordPress должен работать офлайн, соберите Tailwind CSS локально и замените `<script src="...tailwindcss.com">` на inline `<style>` с собранным CSS.
- **Шрифт Inter** грузится с Google Fonts — тоже нужен интернет.
- **AI-анализ** идёт 15–30 секунд. Бэкенд использует SSE с heartbeat каждые 3 сек, чтобы ALB/load balancer не обрывал соединение.
- **Лид-форма** в текущей версии не отправляет данные на сервер (показывает успех локально). Чтобы данные реально приходили — добавьте `/api/lead` route на бэкенд и раскомментируйте fetch в `leadForm` submit handler.

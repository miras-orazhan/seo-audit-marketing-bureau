# Деплой на Plesk — audit.marketingbureau.kz

## Настройка Plesk для Next.js

### Шаг 1. Создать домен в Plesk

1. Plesk → **Sites & Domains → Add Domain**
2. Домен: `audit.marketingbureau.kz`
3. **Create a new webspace** → укажите директорию: `httpdocs`
4. SSL: включите **Let's Encrypt** (бесплатный SSL сертификат)

### Шаг 2. Настроить Node.js в Plesk

1. Откройте домен `audit.marketingbureau.kz` в Plesk
2. Перейдите в **Node.js** (если нет — установите расширение Node.js в Plesk)
3. Настройте:
   - **Node.js version:** 20.x (или новее)
   - **Application mode:** `production`
   - **Application URL:** `audit.marketingbureau.kz`
   - **Application root:** `/httpdocs`
   - **Document root:** `/httpdocs/public` (создайте папку `public` внутри httpdocs)
   - **Startup file:** `server.js` (создастся автоматически при сборке standalone)

### Шаг 3. Настроить Git-деплой в Plesk

1. Plesk → **Git** (установите расширение Git, если нет)
2. **Remote Git repository:** `https://github.com/ВАШ_ЛОГИН/seo-audit.git`
3. **Deployment mode:** `Automatic` — файлы развернутся автоматически при push в репозиторий
4. **Target directory:** `/httpdocs`
5. Нажмите **OK** — Plesk клонирует репозиторий

### Шаг 4. Настроить deploy-команды в Plesk Git

В настройках Git в Plesk → **Deploy settings** → добавьте команды:

**Post-deployment commands (выполняются после pull):**
```bash
npm install --legacy-peer-deps
npm run build
npm run start &
```

Или используйте скрипт `deploy.sh`:
```bash
bash /httpdocs/deploy.sh
```

### Шаг 5. Environment Variables

В Plesk → **Node.js** → **Custom environment variables** добавьте:

```
TELEGRAM_BOT_TOKEN=8775349338:AAG6I6VUuBGdRcZsfkOb36Z3gpRaG2igdqU
TELEGRAM_CHAT_ID=-5177248944
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzuuQ0FUzEBuidt6omEHKGQHkznLN1xf6Rv9VrSIcnEGqNRvaGX2TWA6TCL6P5k5Ezg2g/exec
NEXT_PUBLIC_GTM_ID=GTM-TPQ89ZS5
NODE_ENV=production
PORT=3000
```

### Шаг 6. DNS-настройка

В DNS-панели регистратора домена `marketingbureau.kz`:

```
Тип: A
Имя: audit
Значение: IP-адрес вашего сервера Plesk
```

### Шаг 7. Apache/Nginx настройки в Plesk

Plesk → **Apache & nginx Settings** для `audit.marketingbureau.kz`:

**Дополнительные nginx директивы:**
```nginx
# Проксирование на Node.js
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
}

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options SAMEORIGIN always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Кэширование static-файлов
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Кэширование изображений и шрифтов
location ~* \.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf)$ {
    proxy_pass http://127.0.0.1:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Снимите галочку** с «Proxy mode» и «Smart static files processing» — Node.js сам обслуживает раздачу статических файлов.

### Шаг 8. Проверить

1. Откройте `https://audit.marketingbureau.kz` — сайт должен работать
2. Проверьте:
   - [ ] Главная страница загружается
   - [ ] Аудит URL работает (проверьте marketingbureau.kz)
   - [ ] Лид-форма отправляет в Telegram + Google Sheets
   - [ ] PDF-экспорт работает
   - [ ] GTM загружается
   - [ ] SSL-сертификат активен (https)

---

## Автоматический деплой

После настройки Git в Plesk каждый `git push` в репозиторий GitHub автоматически:

1. Plesk получает уведомление от GitHub (webhook)
2. Plesk делает `git pull` в `/httpdocs`
3. Выполняются post-deployment команды (`deploy.sh`)
4. Приложение пересобирается и перезапускается

Для настройки webhook:
1. Plesk → Git → ваш репозиторий → **Pull updates automatically** → ON
2. Скопируйте webhook URL из Plesk
3. В GitHub: репозиторий → Settings → Webhooks → Add webhook → вставьте URL

---

## Альтернатива: ручной деплой через SSH

```bash
# SSH на сервер Plesk
ssh user@your-server-ip

cd /var/www/vhosts/marketingbureau.kz/audit.marketingbureau.kz/httpdocs

# Получить обновления
git pull origin main

# Установить зависимости
npm install --legacy-peer-deps

# Собрать
npm run build

# Перезапустить Node.js через PM2 (если установлен)
pm2 restart seo-audit

# Или через Plesk:
# Plesk → Node.js → Restart Application
```

---

## Файлы конфигурации деплоя

```
├── next.config.ts         # output: "standalone" — для Plesk/PM2
├── .npmrc                 # npm flags (legacy-peer-deps)
├── .env.example           # Шаблон env-переменных
├── deploy.sh              # Скрипт автодеплоя для Plesk post-deployment
```

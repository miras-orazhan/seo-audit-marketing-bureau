# Google Sheets через Apps Script — финальная настройка

## ⚠️ Текущая проблема

URL `https://script.google.com/macros/s/AKfycbxvtQrBW1Im86u1BLP6wnhYQMlHGIwp5nX3j19AzfH3QS3yKC09RWQVYx4rZ_GwVF3azQ/exec` сейчас возвращает **«找不到頁面 / файл не найден»** на POST-запрос.

**Причина:** скрипт не опубликован как Web App (или опубликован в режиме «Only myself»).

## Что нужно сделать в Google Apps Script

### 1. Открыть проект
[script.google.com](https://script.google.com) → откройте ваш проект

### 2. Вставить код

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    if (data.type === 'lead') {
      // Заявка с лид-формы
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Дата', 'Имя', 'Телефон', 'Email', 'Сайт', 'Комментарий']);
      }
      sheet.appendRow([
        data.date || new Date().toLocaleString('ru-RU'),
        data.name || '',
        data.phone || '',
        data.email || '',
        data.site || '',
        data.message || ''
      ]);
    } else if (data.type === 'audit') {
      // Результат аудита
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Дата', 'URL', 'Overall', 'Technical', 'Content', 'Критичных', 'Предупреждений', 'Главная проблема', 'Имя контакта', 'Телефон контакта', 'Email контакта']);
      }
      sheet.appendRow([
        data.date || new Date().toLocaleString('ru-RU'),
        data.url || '',
        data.overall || '',
        data.technical || '',
        data.content || '',
        data.critical || 0,
        data.warnings || 0,
        data.main_issue || '',
        data.contact_name || '',
        data.contact_phone || '',
        data.contact_email || ''
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. Привязать к таблице

- В Apps Script: **Project Settings** (значок шестерёнки)
- В поле **Google Cloud Platform project (optional)** можно ничего не указывать
- В разделе **Default Spreadsheet** выберите вашу таблицу (если есть опция)
- **ИЛИ** замените `SpreadsheetApp.getActiveSpreadsheet()` на:
  ```javascript
  var sheet = SpreadsheetApp.openById('ID_ВАШЕЙ_ТАБЛИЦЫ').getActiveSheet();
  ```

### 4. КРИТИЧЕСКИ ВАЖНО — Publish как Web App

1. В Apps Script: **Deploy → New deployment**
2. Нажмите **значок шестерёнки** рядом с "Select type" → выберите **Web app**
3. Заполните:
   - **Description:** `Marketing Bureau API`
   - **Execute as:** **Me** (ваш email)
   - **Who has access:** **Anyone** ← обязательно! Иначе будет 401
4. Нажмите **Deploy**
5. **Авторизуйте доступ** когда спросит (Allow)
6. Скопируйте **Web app URL** — он выглядит как:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

### 5. Проверить

Откройте URL в браузере (GET-запрос). Должна появиться страница с JSON-ответом:
```json
{"ok":false,"error":"..."}  // если без параметров — это нормально
```

Если видите «файл не найден» / «找不到頁面» — повторите шаг 4, выбрав **Anyone**.

### 6. Если в будущем меняете код

**НЕ** используйте "Save". Нужно: **Deploy → Manage deployments → Edit (карандаш) → Version: New version → Deploy**. Иначе старый URL будет отдавать старый код.

## После настройки

Заявки и аудиты будут автоматически попадать в Google Sheets. URL Web App уже захардкожен в `src/lib/google-sheets.ts` — если понадобится другой URL, задайте env-переменную `GOOGLE_APPS_SCRIPT_URL`.

## Как это работает

1. Пользователь отправляет лид-форму → `/api/lead` → POST к Apps Script с `{type: 'lead', ...}` → новая строка в таблице
2. Пользователь запускает аудит → после показа дашборда → `/api/audit-save` → POST к Apps Script с `{type: 'audit', ...}` → новая строка в таблице
3. Telegram-уведомление для лидов продолжает работать параллельно (мгновенное оповещение менеджеру)

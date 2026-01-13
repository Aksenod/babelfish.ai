# Настройка прокси для Yandex Translate API

## Проблема

В production на GitHub Pages возникают CORS ошибки при прямых запросах к Yandex Translate API, так как браузер блокирует такие запросы из-за политики безопасности.

## Решение

Используйте serverless функцию для проксирования запросов к Yandex API.

## Вариант 1: Vercel (Рекомендуется)

### Шаг 1: Создайте новый проект на Vercel

1. Зарегистрируйтесь на [Vercel](https://vercel.com) (бесплатно)
2. Создайте новый проект
3. Подключите ваш GitHub репозиторий или загрузите файлы вручную

### Шаг 2: Добавьте файлы прокси

В корне проекта уже созданы файлы:
- `api/yandex-translate.js` - serverless функция
- `vercel.json` - конфигурация Vercel

### Шаг 3: Деплой

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Деплой
vercel
```

Или используйте веб-интерфейс Vercel для автоматического деплоя из GitHub.

### Шаг 4: Настройте переменную окружения

После деплоя вы получите URL вида: `https://your-project.vercel.app`

1. В корне вашего основного проекта создайте файл `.env.production`:
```env
VITE_YANDEX_PROXY_URL=https://your-project.vercel.app/api/yandex-translate
```

2. Или добавьте переменную окружения в настройках GitHub Actions / CI/CD:
```
VITE_YANDEX_PROXY_URL=https://your-project.vercel.app/api/yandex-translate
```

3. Пересоберите проект:
```bash
npm run build
```

## Вариант 2: Netlify Functions

Если предпочитаете Netlify:

1. Создайте файл `netlify/functions/yandex-translate.js`:

```javascript
exports.handler = async (event, context) => {
  // Разрешаем CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = event.headers.authorization?.replace('Api-Key ', '');

    if (!apiKey) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'API key required' }) };
    }

    const response = await fetch('https://translate.api.cloud.yandex.net/translate/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

2. Настройте `netlify.toml`:
```toml
[build]
  functions = "netlify/functions"
```

3. Деплой на Netlify и используйте URL: `https://your-site.netlify.app/.netlify/functions/yandex-translate`

## Вариант 3: Другой сервис

Вы можете использовать любой другой serverless провайдер:
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- Cloudflare Workers

Главное - функция должна:
1. Принимать POST запросы
2. Проксировать их к `https://translate.api.cloud.yandex.net/translate/v2/translate`
3. Передавать заголовок `Authorization: Api-Key {your-key}`
4. Возвращать CORS заголовки

## Проверка работы

После настройки прокси проверьте:

1. Откройте консоль браузера
2. Попробуйте выполнить перевод
3. Убедитесь, что запросы идут к вашему прокси, а не напрямую к Yandex API
4. Проверьте, что CORS ошибки исчезли

## Безопасность

⚠️ **Важно**: Serverless функция должна быть доступна публично, но API ключ передается от клиента. Для дополнительной безопасности можно:

1. Ограничить CORS только вашим доменом:
```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://aksenod.github.io');
```

2. Добавить rate limiting на уровне функции
3. Использовать переменные окружения Vercel для хранения API ключа (но это потребует изменений в коде)

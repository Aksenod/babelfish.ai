/**
 * Vercel Serverless Function для проксирования запросов к Yandex Translate API
 * Решает проблему CORS в production
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://aksenod.github.io',
  'https://aksenod.github.io/babelfish.ai',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const fromEnv = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]);
};

const applyCors = (req, res) => {
  const origin = req.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();
  
  // Устанавливаем Access-Control-Allow-Origin
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && origin.includes('github.io')) {
    // Fallback для любого github.io поддомена
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', DEFAULT_ALLOWED_ORIGINS[0]);
  }
  
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 часа
};

export default async function handler(req, res) {
  // Применяем CORS заголовки ДО проверки метода
  applyCors(req, res);

  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { texts, targetLanguageCode, sourceLanguageCode } = req.body || {};
    const headerKey = req.headers.authorization?.replace('Api-Key ', '');
    const apiKey = headerKey || process.env.YANDEX_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: 'YANDEX_API_KEY is not configured' });
    }

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    // Проксируем запрос к Yandex API
    const yandexResponse = await fetch(
      'https://translate.api.cloud.yandex.net/translate/v2/translate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          targetLanguageCode: targetLanguageCode || 'ru',
          sourceLanguageCode: sourceLanguageCode || 'en',
        }),
      }
    );

    if (!yandexResponse.ok) {
      const error = await yandexResponse.json().catch(() => ({ message: 'Unknown error' }));
      return res.status(yandexResponse.status).json(error);
    }

    const data = await yandexResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Yandex Translate Proxy] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

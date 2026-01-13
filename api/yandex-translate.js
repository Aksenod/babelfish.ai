/**
 * Vercel Serverless Function для проксирования запросов к Yandex Translate API
 * Решает проблему CORS в production
 */

export default async function handler(req, res) {
  // Разрешаем CORS для GitHub Pages домена и localhost для разработки
  const origin = req.headers.origin || '';
  const isGitHubPages = origin.includes('github.io');
  const isLocalhost = origin.startsWith('http://localhost:');
  
  // Разрешаем только GitHub Pages и localhost
  if (isGitHubPages || isLocalhost) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback на основной домен
    res.setHeader('Access-Control-Allow-Origin', 'https://aksenod.github.io');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { texts, targetLanguageCode, sourceLanguageCode } = req.body;
    const apiKey = req.headers.authorization?.replace('Api-Key ', '');

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
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

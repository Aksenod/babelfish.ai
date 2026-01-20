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

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

export default async function handler(req, res) {
  // Применяем CORS заголовки ДО проверки метода
  applyCors(req, res);

  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  try {
    const payload = await readJsonBody(req);
    if (!payload) {
      return res.status(400).json({ error: 'Request body is empty' });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await openaiResponse.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(openaiResponse.status).send(responseText);
  } catch (error) {
    console.error('[OpenAI Summary Proxy] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

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
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', DEFAULT_ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  try {
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const bodyBuffer = await readRequestBody(req);

    if (!bodyBuffer || bodyBuffer.length === 0) {
      return res.status(400).json({ error: 'Request body is empty' });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': contentType,
      },
      body: bodyBuffer,
    });

    const responseText = await openaiResponse.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(openaiResponse.status).send(responseText);
  } catch (error) {
    console.error('[OpenAI Transcribe Proxy] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

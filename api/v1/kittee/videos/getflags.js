// getflags.js
import { decryptOverrides } from 'flags';

// 🍪 Простой парсер куки (заменяет библиотеку cookie)
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      // join на случай если в значении был символ "="
      cookies[name] = valueParts.join('=');
    }
  });
  
  return cookies;
}

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Парсим куки своей функцией
  const cookies = parseCookies(req.headers.cookie || '');
  const overridesCookie = cookies['vercel-flag-overrides'];

  // 2. Если куки нет — возвращаем понятный ответ
  if (!overridesCookie) {
    return res.status(200).json({ 
      status: 'none', 
      message: 'No vercel-flag-overrides cookie found',
      flags: {}
    });
  }

  let flagsData = null;

  // 3. Пытаемся расшифровать (encrypted mode — рекомендуется)
  try {
    flagsData = await decryptOverrides(overridesCookie);
  } catch (decryptError) {
    // 4. Fallback: пробуем распарсить как plaintext
    try {
      const decoded = decodeURIComponent(overridesCookie);
      flagsData = JSON.parse(decoded);
    } catch (parseError) {
      console.error('❌ Failed to parse Vercel flags cookie:', {
        cookiePreview: overridesCookie.substring(0, 100) + '...',
        decryptError: decryptError.message,
        parseError: parseError.message
      });
      
      return res.status(200).json({ 
        status: 'error',
        message: 'Could not decrypt or parse flags cookie',
        error: process.env.NODE_ENV === 'development' 
          ? { decryptError: decryptError.message, parseError: parseError.message } 
          : undefined,
        flags: {}
      });
    }
  }

  // 5. Валидация: флаги должны быть объектом (не массивом)
  if (!flagsData || typeof flagsData !== 'object' || Array.isArray(flagsData)) {
    return res.status(200).json({
      status: 'invalid',
      message: 'Flags data is not a valid object',
      flags: {}
    });
  }

  // 6. Успех: возвращаем флаги + метаданные
  return res.status(200).json({
    status: 'ok',
    flags: flagsData,
    count: Object.keys(flagsData).length,
    timestamp: new Date().toISOString()
  });
}

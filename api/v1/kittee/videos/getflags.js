// getflags.js
import { parseCookie } from 'cookie';
import { decryptOverrides, safeJsonStringify } from 'flags';

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Парсим куки
  const cookies = parseCookie(req.headers.cookie || '');
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
  let errorDetails = null;

  // 3. Пытаемся расшифровать (encrypted mode — рекомендуется)
  try {
    flagsData = await decryptOverrides(overridesCookie);
  } catch (decryptError) {
    errorDetails = { decryptError: decryptError.message };
    
    // 4. Fallback: пробуем распарсить как plaintext (если overrideEncryptionMode: 'plaintext')
    try {
      const decoded = decodeURIComponent(overridesCookie);
      flagsData = JSON.parse(decoded);
    } catch (parseError) {
      // 5. Если оба способа не сработали — логируем и возвращаем ошибку
      console.error('❌ Failed to parse Vercel flags cookie:', {
        cookiePreview: overridesCookie.substring(0, 100) + '...',
        decryptError: errorDetails.decryptError,
        parseError: parseError.message
      });
      
      return res.status(200).json({ 
        status: 'error',
        message: 'Could not decrypt or parse flags cookie',
        error: process.env.NODE_ENV === 'development' ? { decryptError: errorDetails.decryptError, parseError: parseError.message } : undefined,
        flags: {}
      });
    }
  }

  // 6. Валидация: флаги должны быть объектом
  if (!flagsData || typeof flagsData !== 'object' || Array.isArray(flagsData)) {
    return res.status(200).json({
      status: 'invalid',
      message: 'Flags data is not a valid object',
      flags: {}
    });
  }

  // 7. Успех: возвращаем флаги + метаданные
  return res.status(200).json({
    status: 'ok',
    flags: flagsData,
    count: Object.keys(flagsData).length,
    timestamp: new Date().toISOString()
  });
}

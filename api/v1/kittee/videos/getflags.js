// getflags.js
import { decryptOverrides } from 'flags';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name] = valueParts.join('=');
    }
  });
  
  return cookies;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cookies = parseCookies(req.headers.cookie || '');
  const overridesCookie = cookies['vercel-flag-overrides'];

  if (!overridesCookie) {
    return res.status(200).json({ 
      status: 'none', 
      message: 'No vercel-flag-overrides cookie found',
      flags: {}
    });
  }

  let flagsData = null;
  let debugInfo = {
    cookieLength: overridesCookie.length,
    cookiePreview: overridesCookie.substring(0, 50) + '...',
    method: null
  };

  // Попытка 1: расшифровать через decryptOverrides
  try {
    flagsData = await decryptOverrides(overridesCookie);
    debugInfo.method = 'decryptOverrides';
    debugInfo.returnType = typeof flagsData;
    debugInfo.isArray = Array.isArray(flagsData);
    debugInfo.keys = flagsData && typeof flagsData === 'object' 
      ? Object.keys(flagsData) 
      : null;
  } catch (decryptError) {
    debugInfo.decryptError = decryptError.message;
    
    // Попытка 2: plaintext режим
    try {
      const decoded = decodeURIComponent(overridesCookie);
      flagsData = JSON.parse(decoded);
      debugInfo.method = 'plaintext-fallback';
    } catch (parseError) {
      return res.status(200).json({ 
        status: 'error',
        message: 'Could not decrypt or parse flags cookie',
        debug: debugInfo,
        flags: {}
      });
    }
  }

  // Возвращаем подробную отладочную информацию
  return res.status(200).json({
    status: 'ok',
    debug: debugInfo,
    flags: flagsData,
    rawFlagsData: flagsData, // Посмотри, что именно возвращается
    count: flagsData && typeof flagsData === 'object' && !Array.isArray(flagsData)
      ? Object.keys(flagsData).length
      : 0
  });
}

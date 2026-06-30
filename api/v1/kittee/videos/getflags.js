import { parse as parseCookies } from 'cookie';
import { decryptOverrides } from 'flags';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cookies = parseCookies(req.headers.cookie || '');
  const overridesCookie = cookies['vercel-flag-overrides'];

  if (!overridesCookie) {
    return res.status(200).json({ status: 'none', message: 'No Vercel flags cookie found' });
  }

  let flagsData = null;

  try {
    // Пытаемся расшифровать — работает если у тебя FLAGS_SECRET в env
    // и Toolbar настроен в encrypted mode (рекомендуемый режим)
    flagsData = await decryptOverrides(overridesCookie);
  } catch (decryptError) {
    // Если расшифровка не сработала — возможно cookie в plaintext режиме
    // (overrideEncryptionMode: 'plaintext')
    try {
      flagsData = JSON.parse(decodeURIComponent(overridesCookie));
    } catch (parseError) {
      console.error('Failed to parse Vercel flags cookie:', { decryptError, parseError });
      return res.status(200).json({ 
        status: 'error', 
        message: 'Could not decrypt or parse flags cookie',
        raw: overridesCookie.substring(0, 50) + '...'
      });
    }
  }

  // Если flagsData — объект с ключами, отдаем его
  if (flagsData && typeof flagsData === 'object' && Object.keys(flagsData).length > 0) {
    return res.status(200).json({
      status: 'ok',
      flags: flagsData,
      count: Object.keys(flagsData).length
    });
  }

  return res.status(200).json({ status: 'empty', message: 'Flags cookie exists but is empty' });
}

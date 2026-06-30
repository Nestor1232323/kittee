import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

// Хелпер для парсинга кук
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;

  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
  });
  return list;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Не авторизован' });
  const token = authHeader.split(' ')[1];

  try {
    jwt.verify(token, JWT_SECRET);

    let finalFlags = 'none';

    const cookies = parseCookies(req);
    const vercelToolbarOverrides = cookies['__vercel_toolbar_overrides'];

    if (vercelToolbarOverrides) {
      try {
        // Парсим вообще все флаги, которые сейчас активны в Vercel
        const parsedFlags = JSON.parse(decodeURIComponent(vercelToolbarOverrides));
        
        // Если объект не пустой, записываем его в ответ
        if (parsedFlags && Object.keys(parsedFlags).length > 0) {
          finalFlags = parsedFlags;
        }
      } catch (e) {
        console.error('Ошибка парсинга флагов Vercel:', e.message);
      }
    }

    // Возвращаем JSON со всеми найденными флагами или "none"
    return res.status(200).json(finalFlags);

  } catch (err) {
    console.error('Error getting flags:', err.message);
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

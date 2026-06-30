import { getOverrides } from 'flags/next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

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

    // Забираем актуальные переопределения напрямую из Vercel
    const overrides = await getOverrides();

    // Если флага нет в Vercel, присваиваем значение 'none'
    const newhomeFlag = overrides?.['client.windows.newhome'] !== undefined 
      ? overrides['client.windows.newhome'] 
      : 'none';

    return res.status(200).json({
      client: {
        windows: {
          newhome: newhomeFlag
        }
      }
    });

  } catch (err) {
    console.error('Error getting Vercel flags:', err.message);
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

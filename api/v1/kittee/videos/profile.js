import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Берем свежие данные из базы по id из токена
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, username, email, avatar_url, avatar_shape, description, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) throw new Error('Пользователь не найден');

    return res.status(200).json(user);
  } catch (err) {
    return res.status(401).json({ error: 'Сессия истекла' });
  }
}
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
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Вытягиваем юзера + историю + данные видео внутри истории
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, name, username, avatar_url, avatar_shape, description, created_at,
        history (
          viewed_at,
          video:video_id (
            id,
            title,
            thumbnail_url,
            duration,
            views
          )
        )
      `)
      .eq('id', decoded.userId)
      .order('viewed_at', { foreignTable: 'history', ascending: false })
      .limit(10, { foreignTable: 'history' }) // Последние 10 видосов
      .single();

    if (error || !user) throw new Error('Пользователь не найден или ошибка БД');

    return res.status(200).json(user);
  } catch (err) {
    return res.status(401).json({ error: 'Сессия истекла или ошибка запроса' });
  }
}
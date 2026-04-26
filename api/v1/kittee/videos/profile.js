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
    
    // ВАЖНО: Используем !user_id и !video_id, чтобы явно указать ключи
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, 
        name, 
        username, 
        avatar_url, 
        avatar_shape, 
        description, 
        created_at,
        history!user_id (
          viewed_at,
          video:video_id (
            id,
            title,
            thumbnail_url,
            duration,
            views,
            video_url
          )
        )
      `)
      .eq('id', decoded.userId)
      // Сортировка истории:
      .order('viewed_at', { foreignTable: 'history', ascending: false })
      .single();

    if (error) {
      console.error('Supabase Error:', error); // Это появится в логах Vercel
      return res.status(500).json({ error: error.message });
    }

    if (!user) return res.status(404).json({ error: 'Юзер не найден' });

    return res.status(200).json(user);
  } catch (err) {
    console.error('JWT/Auth Error:', err);
    return res.status(401).json({ error: 'Сессия истекла или ошибка сервера' });
  }
}
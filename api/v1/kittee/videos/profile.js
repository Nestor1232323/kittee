import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // --- ЛОГИКА GET: ПОЛУЧЕНИЕ ПРОФИЛЯ ---
    if (req.method === 'GET') {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id, name, username, avatar_url, avatar_shape, description, created_at,
          history!user_id (
            viewed_at,
            video:video_id (
              id, title, thumbnail_url, duration, views, video_url
            )
          )
        `)
        .eq('id', userId)
        .order('viewed_at', { foreignTable: 'history', ascending: false })
        .limit(15, { foreignTable: 'history' }) // Берем последние 15 записей
        .single();

      if (error) throw error;
      return res.status(200).json(user);
    }

    // --- ЛОГИКА POST: ДОБАВЛЕНИЕ В ИСТОРИЮ ---
    if (req.method === 'POST') {
      const { video_id } = req.body;
      if (!video_id) return res.status(400).json({ error: 'video_id обязателен' });

      const { error } = await supabase
        .from('history')
        .insert([{ user_id: userId, video_id: video_id }]);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(401).json({ error: 'Ошибка авторизации или сервера' });
  }
}
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
  if (!authHeader) return res.status(401).json({ error: 'Не авторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { g } = req.query;

    // --- ЛОГИКА: ПОЛУЧЕНИЕ ПРОФИЛЯ + ИСТОРИЯ (БЕЗ FOREIGN KEYS) ---
    if (g === 'checkprofile' || req.method === 'GET') {
      
      // 1. Берем данные юзера
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, avatar_shape, description, created_at')
        .eq('id', userId)
        .single();

      if (userErr || !user) throw new Error('Юзер не найден');

      // 2. Берем историю (просто плоский список)
      const { data: historyItems, error: histErr } = await supabase
        .from('history')
        .select('video_id, viewed_at')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(15);

      if (histErr) throw histErr;

      // 3. Если история есть, вытягиваем данные по этим видео
      let finalHistory = [];
      if (historyItems && historyItems.length > 0) {
        const videoIds = historyItems.map(h => h.video_id);
        
        const { data: videos, error: vidErr } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, video_url')
          .in('id', videoIds);

        if (!vidErr) {
          // Склеиваем дату просмотра с данными видео
          finalHistory = historyItems.map(h => ({
            viewed_at: h.viewed_at,
            video: videos.find(v => v.id === h.video_id)
          })).filter(h => h.video != null); // Убираем, если видео вдруг удалено
        }
      }

      // Собираем всё в один объект, как ты хотел
      return res.status(200).json({
        ...user,
        history: finalHistory
      });
    }

    // --- ЛОГИКА: ДОБАВЛЕНИЕ В ИСТОРИЮ ---
    if (g === 'addhistory' || req.method === 'POST') {
      const { video_id } = req.body;
      if (!video_id) return res.status(400).json({ error: 'video_id обязателен' });

      const { error } = await supabase
        .from('history')
        .insert([{ user_id: userId, video_id: video_id }]);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
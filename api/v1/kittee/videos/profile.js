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
    
    if (g === 'getsub') {
      const { data: subs, error: subsErr } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('subscriber_id', userId); 

      if (subsErr) throw subsErr;

      if (!subs || subs.length === 0) {
        return res.status(200).json([]);
      }

      const authorIds = subs.map(s => s.channel_id);

      const { data: authors, error: authorsErr } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, avatar_shape, description')
        .in('id', authorIds);

      if (authorsErr) throw authorsErr;

      return res.status(200).json(authors);
    }

    if (g === 'checkprofile' || !g) {      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, avatar_shape, description, created_at')
        .eq('id', userId)
        .single();

      if (userErr || !user) throw new Error('Юзер не найден');

      const { data: historyItems, error: histErr } = await supabase
        .from('history')
        .select('video_id, viewed_at')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(15);

      let finalHistory = [];
      if (historyItems && historyItems.length > 0) {
        const videoIds = historyItems.map(h => h.video_id);
        
        const { data: videos, error: vidErr } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, video_url, uploaded_at, font')
          .in('id', videoIds);

        if (!vidErr) {
          finalHistory = historyItems.map(h => {
            const videoData = videos.find(v => v.id === h.video_id);
            if (!videoData) return null;

            // ХАК ДЛЯ FLUTTER: Добавляем данные автора прямо в объект видео,
            // чтобы VideoCard не ругался на Null String
            return {
              viewed_at: h.viewed_at,
              video: {
                ...videoData,
                username: user.username,
                avatar_url: user.avatar_url,
                avatar_shape: user.avatar_shape,
                // Если у видео нет даты загрузки, используем дату просмотра
                uploaded_at: videoData.uploaded_at || h.viewed_at 
              }
            };
          }).filter(h => h !== null);
        }
      }

      return res.status(200).json({
        ...user,
        history: finalHistory
      });
    }
   
    // --- ЛОГИКА: ДОБАВЛЕНИЕ В ИСТОРИЮ (?g=addhistory) ---
    if (g === 'addhistory' || req.method === 'POST') {
      const { video_id } = req.body;
      if (!video_id) return res.status(400).json({ error: 'video_id обязателен' });

      const { error } = await supabase
        .from('history')
        .insert([{ user_id: userId, video_id: video_id }]);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Неверный параметр g или метод' });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
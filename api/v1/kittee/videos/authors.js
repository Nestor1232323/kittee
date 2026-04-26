import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { t, author_id } = req.query; // t - тип действия, author_id - id канала

  // Вспомогательная функция для получения ID текущего юзера из токена
  const getUserId = (authHeader) => {
    if (!authHeader) return null;
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.userId;
    } catch (e) {
      return null;
    }
  };

  try {
    // --- 1. ПРОСМОТР ВИДЕО И ИНФО АВТОРА (?t=view_videos) ---
    if (t === 'view_videos' && author_id) {
      const currentUserId = getUserId(req.headers.authorization);

      // Получаем данные автора и счетчик подписчиков
      const { data: author, error: authorErr } = await supabase
        .from('users')
        .select(`
          id, name, username, avatar_url, avatar_shape, description,
          subscribers:subscriptions!channel_id(count)
        `)
        .eq('id', author_id)
        .single();

      if (authorErr || !author) return res.status(404).json({ error: 'Автор не найден' });

      // Получаем видео автора
      const { data: videos, error: vidErr } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', author_id)
        .order('uploaded_at', { ascending: false });

      // Проверяем, подписан ли текущий юзер (если он авторизован)
      let isSubscribed = false;
      if (currentUserId) {
        const { data: subCheck } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', currentUserId)
          .eq('channel_id', author_id)
          .single();
        if (subCheck) isSubscribed = true;
      }

      // Считаем количество видео
      const { count: videoCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', author_id);

      return res.status(200).json({
        author: {
          ...author,
          subscriber_count: author.subscribers[0]?.count || 0,
          video_count: videoCount || 0,
          is_subscribed: isSubscribed
        },
        videos: videos || []
      });
    }

    // --- 2. ПОДПИСКА (?t=subscribe) ---
    if (t === 'subscribe' && req.method === 'POST') {
      const userId = getUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Нужна авторизация' });

      const { channel_id } = req.body;
      if (userId === channel_id) return res.status(400).json({ error: 'Нельзя подписаться на самого себя' });

      const { error } = await supabase
        .from('subscriptions')
        .upsert({ subscriber_id: userId, channel_id: channel_id }, { onConflict: 'subscriber_id, channel_id' });

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // --- 3. ОТПИСКА (?t=unsubscribe) ---
    if (t === 'unsubscribe' && req.method === 'POST') {
      const userId = getUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Нужна авторизация' });

      const { channel_id } = req.body;

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscriber_id', userId)
        .eq('channel_id', channel_id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Неверный параметр t или отсутствуют данные' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { g, q } = req.query; // g = режим, q = запрос

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!q || q.trim().length === 0) {
    return res.status(200).json(g === 'suggestions' ? [] : { status: true, videos: [] });
  }

  const queryText = q.trim();

  try {
    // --- РЕЖИМ ПОДСКАЗОК (SUGGESTIONS) ---
    if (g === 'suggestions') {
      const { data, error } = await supabase
        .from('videos')
        .select('title')
        .ilike('title', `%${queryText}%`)
        .limit(8);

      if (error) throw error;
      
      // Возвращаем плоский массив строк без дублей
      const suggestions = [...new Set(data.map(v => v.title))];
      return res.status(200).json(suggestions);
    }

    // --- РЕЖИМ ПОИСКА (SEARCH) ---
    if (g === 'search') {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id, user_id, title, description, video_url, thumbnail_url,
          duration, views, uploaded_at,
          users (name, username, avatar_url, avatar_shape)
        `)
        .or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`)
        .order('uploaded_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedVideos = data.map(video => ({
        ...video,
        name: video.users?.name,
        username: video.users?.username,
        avatar_url: video.users?.avatar_url,
        avatar_shape: video.users?.avatar_shape || 'circle',
        users: video.users // Оставляем объект users для совместимости с твоим кодом во Flutter
      }));

      return res.status(200).json({ status: true, videos: formattedVideos });
    }

    // Если g не указан или указан неверно
    return res.status(400).json({ error: 'Не указан корректный параметр g (suggestions/search)' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: false, error: error.message });
  }
}
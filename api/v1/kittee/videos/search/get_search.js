// api/v1/kittee/videos/search/get_search.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { q } = req.query; // Параметр ?q=...

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!q) return res.status(200).json({ status: true, videos: [] });

    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, user_id, title, description, video_url, thumbnail_url,
        duration, views, uploaded_at,
        users (username, avatar_url, avatar_shape)
      `)
      // Поиск по заголовку ИЛИ описанию
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const formattedVideos = data.map(video => ({
      ...video,
      username: video.users?.username,
      avatar_url: video.users?.avatar_url,
      avatar_shape: video.users?.avatar_shape || 'c9_sided_cookie',
      users: undefined // Удаляем вложенный объект
    }));

    return res.status(200).json({ status: true, videos: formattedVideos });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
}
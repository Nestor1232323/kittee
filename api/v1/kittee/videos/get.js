import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.kittee_SUPABASE_URL;
const supabaseKey = process.env.kittee_SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Настройка CORS (как в твоем PHP скрипте)
  const origin = req.headers.origin || '';
  const allowedOrigins = ['http://localhost', 'http://k7video.getenjoyment.net'];
  
  if (allowedOrigins.some(ao => origin.startsWith(ao))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'http://k7video.getenjoyment.net');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Выполняем запрос к таблице videos с присоединением данных юзера (Join)
    // В Supabase (PostgREST) это делается через выборку связанных полей
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, 
        user_id, 
        title, 
        description, 
        video_url, 
        thumbnail_url,
        duration, 
        views, 
        font,
        uploaded_at,
        users (
          username,
          avatar_url,
          avatar_shape
        )
      `)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Форматируем данные, чтобы они соответствовали твоему старому PHP API
    const formattedVideos = data.map(video => ({
      id: video.id,
      user_id: video.user_id,
      title: video.title,
      description: video.description,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      duration: video.duration,
      views: video.views,
      uploaded_at: video.uploaded_at,
      username: video.users?.username,
      avatar_url: video.users?.avatar_url,
      avatar_shape: video.users?.avatar_shape || 'circle',
      font: video.font,
    }));

    return res.status(200).json({
      status: true,
      videos: formattedVideos
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
}
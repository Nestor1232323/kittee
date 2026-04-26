import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { id } = req.query; // Получаем ID из названия файла [id].js

  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*'); // Для теста можно оставить *, или прописать домены
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        users (
          username,
          avatar_url,
          avatar_shape
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Форматируем ответ под старый PHP стиль
    const formattedVideo = {
      ...data,
      username: data.users?.username,
      avatar_url: data.users?.avatar_url,
      avatar_shape: data.users?.avatar_shape || 'circle',
      name: data.users?.name,
    };
    delete formattedVideo.users; // Удаляем вложенный объект, чтобы структура была плоской

    return res.status(200).json(formattedVideo);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
// api/v1/kittee/videos/search/get_suggest.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { q } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!q || q.length < 2) return res.status(200).json([]);

    const { data, error } = await supabase
      .from('videos')
      .select('title')
      .ilike('title', `%${q}%`) // Только по заголовку для подсказок
      .limit(5);

    if (error) throw error;

    // Превращаем [{title: '...'}] в ['...', '...']
    const suggestions = data.map(v => v.title);

    return res.status(200).json(suggestions);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
// api/v1/kittee/videos/search/get_suggest.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { q } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Убираем ограничение в 2 символа. Теперь работает даже от 1 буквы.
    // Если пусто — отдаем пустой массив.
    if (!q || q.trim().length === 0) {
      return res.status(200).json([]);
    }

    const queryText = q.trim();

    // 2. Делаем запрос к Supabase
    const { data, error } = await supabase
      .from('videos')
      .select('title')
      // 'ilike' делает поиск регистронезависимым. 
      // '%${queryText}%' найдет букву в середине, начале или конце.
      .ilike('title', `%${queryText}%`) 
      // Сортируем, чтобы сначала шли заголовки, которые НАЧИНАЮТСЯ с этой буквы
      // (опционально, но так удобнее пользователю)
      .limit(8); // Можно чуть увеличить лимит до 8 для красоты

    if (error) throw error;

    // 3. Фильтруем дубликаты (если вдруг есть видео с одинаковыми названиями)
    const suggestions = [...new Set(data.map(v => v.title))];

    return res.status(200).json(suggestions);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
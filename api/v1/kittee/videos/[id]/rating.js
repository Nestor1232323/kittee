import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { id: video_id } = req.query; // ID видео из URL

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Для POST и DELETE вытаскиваем userId из заголовка (предполагаем, что ты передаешь его)
  const userId = req.headers['x-user-id']; 

  try {
    // --- GET: ПОЛУЧЕНИЕ ОЦЕНКИ (ПУБЛИЧНО) ---
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('rate')
        .select('rate')
        .eq('video_id', video_id);

      if (error) throw error;

      const likes = data.filter(r => r.rate === '1').length;
      const dislikes = data.filter(r => r.rate === '0').length;

      return res.status(200).json({
        likes,
        dislikes,
        total: data.length
      });
    }

    // --- ПРОВЕРКА АВТОРИЗАЦИИ ДЛЯ POST И DELETE ---
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация (x-user-id)' });
    }

    // --- POST: УСТАНОВКА ОЦЕНКИ ---
    if (req.method === 'POST') {
      const { rate } = req.body; // "1" или "0"
      
      if (rate !== '1' && rate !== '0') {
        return res.status(400).json({ error: 'Неверное значение rate. Используйте "1" или "0"' });
      }

      // Используем upsert, чтобы пользователь мог изменить лайк на дизлайк (и наоборот)
      // Для этого в таблице 'rate' должен быть уникальный индекс (user_id, video_id)
      const { error } = await supabase
        .from('rate')
        .upsert(
          { user_id: userId, video_id: video_id, rate: rate },
          { onConflict: 'user_id, video_id' }
        );

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Оценка сохранена' });
    }

    // --- DELETE: УДАЛЕНИЕ ОЦЕНКИ ---
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('rate')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', video_id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Оценка удалена' });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });

  } catch (error) {
    console.error('Rating Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
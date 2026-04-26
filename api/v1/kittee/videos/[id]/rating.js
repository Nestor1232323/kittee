import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  const { id: video_id } = req.query; // Извлекаем ID видео из названия файла [id]

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- GET: ПУБЛИЧНАЯ СТАТИСТИКА (Без токена) ---
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('rate')
        .select('rate')
        .eq('video_id', video_id);

      if (error) throw error;

      const likes = data.filter(r => r.rate === '1').length;
      const dislikes = data.filter(r => r.rate === '0').length;

      // Если передан токен, проверим, что поставил именно этот юзер
      let userRate = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET);
          const currentRate = data.find(r => r.user_id === decoded.userId); // Нужен select('rate, user_id') выше если проверять так
          // Но лучше сделаем отдельный быстрый запрос для точности:
          const { data: myRate } = await supabase
            .from('rate')
            .select('rate')
            .eq('video_id', video_id)
            .eq('user_id', decoded.userId)
            .single();
          if (myRate) userRate = myRate.rate;
        } catch (e) { /* Токен невалиден — просто не возвращаем userRate */ }
      }

      return res.status(200).json({
        likes,
        dislikes,
        user_rate: userRate // '1', '0' или null
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- ДЛЯ POST И DELETE НУЖНА АВТОРИЗАЦИЯ ---
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Не авторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // --- POST: ПОСТАВИТЬ ЛАЙК/ДИЗЛАЙК ---
    if (req.method === 'POST') {
      const { rate } = req.body; // '1' или '0'
      if (!['0', '1'].includes(rate)) return res.status(400).json({ error: 'Неверное значение rate' });

      // Используем upsert, чтобы юзер не мог спамить записями (один юзер = один голос на видео)
      const { data, error } = await supabase
        .from('rate')
        .upsert(
          { user_id: userId, video_id: video_id, rate: rate },
          { onConflict: 'user_id, video_id' } // Убедись, что в БД есть уникальный индекс на эти два поля
        )
        .select();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // --- DELETE: УБРАТЬ ОЦЕНКУ ---
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('rate')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', video_id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
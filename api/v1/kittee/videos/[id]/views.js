import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  const { id: video_id } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Пробуем достать userId из токена (если он есть)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) { /* Игнорируем ошибку токена для анонимов */ }
    }

    // Добавляем запись в таблицу просмотров
    // Используем upsert или проверку, чтобы не дублировать, если есть Unique Index
    const { error } = await supabase
      .from('views')
      .upsert(
        { user_id: userId, video_id: video_id }, 
        { onConflict: 'user_id, video_id' }
      );

    if (error) throw error;

    // Получаем обновленное количество просмотров из таблицы videos (синхронизировано триггером)
    const { data: videoData, error: fetchError } = await supabase
      .from('videos')
      .select('views')
      .eq('id', video_id)
      .single();

    if (fetchError) throw fetchError;

    return res.status(200).json({
      status: true,
      video_id: video_id,
      views: videoData.views
    });

  } catch (error) {
    console.error('View tracking error:', error.message);
    return res.status(500).json({ status: false, error: error.message });
  }
}
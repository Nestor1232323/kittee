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

  // 1. ЖЕСТКАЯ ПРОВЕРКА JWT
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Auth required' });

  let userId;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // 2. ПРОВЕРКА ВРЕМЕНИ ПОСЛЕДНЕГО ПРОСМОТРА
    // Ищем последнюю запись для этого юзера и этого видео
    const { data: lastView, error: viewError } = await supabase
      .from('views')
      .select('created_at')
      .eq('user_id', userId)
      .eq('video_id', video_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (viewError) throw viewError;

    const now = new Date(); // JS Date по умолчанию работает с UTC при сравнении ISO строк
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 минут

    if (lastView) {
      const lastViewTime = new Date(lastView.created_at);
      if (now - lastViewTime < COOLDOWN_MS) {
        // Если прошло меньше 30 минут, просто отдаем текущие просмотры без записи
        return fetchAndReturnViews(video_id, res);
      }
    }

    // 3. ЗАПИСЬ ПРОСМОТРА
    // Используем insert, так как нам нужны исторические данные для проверки времени,
    // либо upsert, если ты обновляешь 'updated_at'
    const { error: insertError } = await supabase
      .from('views')
      .upsert({ 
        user_id: userId, 
        video_id: video_id, 
        created_at: now.toISOString() // Принудительно обновляем время
      }, { onConflict: 'user_id, video_id' });

    if (insertError) throw insertError;

    return fetchAndReturnViews(video_id, res);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ status: false, error: error.message });
  }
}

// Вынес получение просмотров в функцию, чтобы не дублировать код
async function fetchAndReturnViews(video_id, res) {
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
}
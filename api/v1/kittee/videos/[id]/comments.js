import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  const { id } = req.query; // video_id

  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- GET: Получение списка комментариев ---
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, text, created_at,
        users (id, username, name, avatar_url, avatar_shape)
      `)
      .eq('video_id', id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // --- POST: Добавление нового комментария ---
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нужна авторизация' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;

      const { text } = req.body;
      if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Текст пуст' });

      const { data, error } = await supabase
        .from('comments')
        .insert([
          { video_id: id, user_id: userId, text: text }
        ])
        .select(`
          id, text, created_at,
          users (id, username, name, avatar_url, avatar_shape)
        `)
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен или ошибка базы' });
    }
  }

  return res.status(405).end();
}
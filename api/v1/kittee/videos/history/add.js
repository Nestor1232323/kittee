import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).end();
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { video_id } = req.body;

    // Используем upsert или просто insert
    const { error } = await supabase
      .from('history')
      .insert([{ user_id: decoded.userId, video_id: video_id }]);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
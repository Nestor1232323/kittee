import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  try {
    const finalUsername = username.startsWith('@') ? username : `@${username}`;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', finalUsername)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' } // Сделаем сессию подольше, раз это видосики
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
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

  const { email, password } = req.body;

  try {
    // 1. Ищем пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // 2. Проверяем пароль (bcrypt поймет, что это $2y$)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // 3. Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        avatar: user.avatar_url 
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Токен живет неделю
    );

    // Отдаем токен и инфу о юзере (кроме пароля!)
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
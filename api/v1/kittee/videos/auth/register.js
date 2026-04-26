import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, username, name } = req.body;

  try {
    if (!username || !password) return res.status(400).json({ error: 'Username и пароль обязательны' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalUsername = username.startsWith('@') ? username : `@${username}`;

    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          password: hashedPassword, 
          username: finalUsername,
          name: name || username, // Если имя не ввели, используем ник
          avatar_shape: 'circle',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Этот Username уже занят' });
      throw error;
    }

    return res.status(201).json({ message: 'Регистрация успешна', userId: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
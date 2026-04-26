import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, name } = req.body;

  try {
    // 1. Хешируем пароль (соль 10 раундов)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Сохраняем в базу
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          email, 
          password: hashedPassword, 
          username: username.startsWith('@') ? username : `@${username}`,
          name,
          avatar_shape: 'circle', // дефолт
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Email или Username уже заняты' });
      throw error;
    }

    return res.status(201).json({ message: 'Регистрация успешна', userId: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
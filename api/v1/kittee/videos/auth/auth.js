import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  // Настройка CORS-заголовков для работы с разных доменов
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Получаем экшен из URL (?action=login или ?action=register)
  const { action } = req.query; 
  const { username, password, name } = req.body;

  // Базовая проверка обязательных полей для обоих экшенов
  if (!username || !password) {
    return res.status(400).json({ error: 'Username и пароль обязательны' });
  }

  try {
    // Автоматически добавляем @ в начало никнейма, если его нет
    const finalUsername = username.startsWith('@') ? username : `@${username}`;

    // === ЛОГИКА РЕГИСТРАЦИИ ===
    if (action === 'register') {
      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: newUser, error: registerError } = await supabase
        .from('users')
        .insert([
          { 
            password: hashedPassword, 
            username: finalUsername,
            name: name || username, 
            avatar_shape: 'circle',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (registerError) {
        // Обработка неуникального username (ошибка Unique Violation в PostgreSQL)
        if (registerError.code === '23505') {
          return res.status(400).json({ error: 'Этот Username уже занят' });
        }
        throw registerError;
      }

      // Сразу генерируем JWT-токен, чтобы пользователю не нужно было логиниться после регистрации
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json({ message: 'Регистрация успешна', token, user: userWithoutPassword });
    }

    // === ЛОГИКА АВТОРИЗАЦИИ (LOGIN) ===
    if (action === 'login' || !action) {
      const { data: user, error: loginError } = await supabase
        .from('users')
        .select('*')
        .eq('username', finalUsername)
        .single();

      if (loginError || !user) {
        return res.status(401).json({ error: 'Пользователь не найден' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }

      // Генерация сессионного токена на 30 дней
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({ token, user: userWithoutPassword });
    }

    // Обработка некорректного параметра в query
    return res.status(400).json({ error: 'Неверный параметр action. Используйте login или register.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

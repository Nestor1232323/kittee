import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);
const JWT_SECRET = process.env.kittee_SUPABASE_JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Не авторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { g } = req.query; 
    
    if (g === 'getsub') {
      const { data: subs, error: subsErr } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('subscriber_id', userId); 

      if (subsErr) throw subsErr;

      if (!subs || subs.length === 0) {
        return res.status(200).json([]);
      }

      const authorIds = subs.map(s => s.channel_id);

      const { data: authors, error: authorsErr } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, avatar_shape, description')
        .in('id', authorIds);

      if (authorsErr) throw authorsErr;

      return res.status(200).json(authors);
    }
    if (g === 'updateprofile') {
      // Извлекаем avatar_url и avatar_shape из тела запроса
      const { avatar_url, avatar_shape, name, description } = req.body;
      
      // Формируем объект для обновления (только те поля, которые переданы)
      const updateData = {};
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (avatar_shape !== undefined) updateData.avatar_shape = avatar_shape;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, user: data });
    }

    if (g === 'resetpassword') {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Старый и новый пароль обязательны' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Новый пароль должен быть минимум 6 символов' });
      }

      // Получаем текущего пользователя с паролем
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();
      
      if (fetchError || !user) throw new Error('Пользователь не найден');

      // Проверяем старый пароль
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Неверный старый пароль' });
      }

      // Хешируем и обновляем новый пароль
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedNewPassword })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      return res.status(200).json({ success: true, message: 'Пароль успешно изменён' });
    }
    if (g === 'checkprofile' || !g) {      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, name, username, verified, avatar_url, avatar_shape, description, created_at')
        .eq('id', userId)
        .single();

      if (userErr || !user) throw new Error('Юзер не найден');

      const { data: historyItems, error: histErr } = await supabase
        .from('history')
        .select('video_id, viewed_at')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(15);

      let finalHistory = [];
      if (historyItems && historyItems.length > 0) {
        const videoIds = historyItems.map(h => h.video_id);
        
        const { data: videos, error: vidErr } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, video_url, uploaded_at, font, user_id')
          .in('id', videoIds);

        if (!vidErr && videos) {
          // Получаем ID авторов видео
          const authorIds = [...new Set(videos.map(v => v.user_id))];
          
          const { data: authors } = await supabase
            .from('users')
            .select('id, username, name, avatar_url, avatar_shape')
            .in('id', authorIds);

          const authorMap = {};
          if (authors) {
            authors.forEach(author => {
              authorMap[author.id] = author;
            });
          }

          finalHistory = historyItems.map(h => {
            const videoData = videos.find(v => v.id === h.video_id);
            if (!videoData) return null;

            const author = authorMap[videoData.user_id] || {};

            return {
              viewed_at: h.viewed_at,
              video: {
                id: videoData.id,
                title: videoData.title,
                thumbnail_url: videoData.thumbnail_url,
                duration: videoData.duration,
                views: videoData.views,
                video_url: videoData.video_url,
                uploaded_at: videoData.uploaded_at || h.viewed_at,
                font: videoData.font,
                username: author.username || 'Unknown',
                name: author.name,
                avatar_url: author.avatar_url,
                avatar_shape: author.avatar_shape
              }
            };
          }).filter(h => h !== null);
        }
      }

      return res.status(200).json({
        ...user,
        history: finalHistory
      });
    }
      
    if (g === 'addhistory' || req.method === 'POST') {
      const { video_id } = req.body;
      if (!video_id) return res.status(400).json({ error: 'video_id обязателен' });

      // 1. Ищем последнюю запись об этом видео для этого пользователя
      const { data: existingHistory, error: fetchError } = await supabase
        .from('history')
        .select('created_at')
        .eq('user_id', userId)
        .eq('video_id', video_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      // 2. Проверяем условие 30 минут
      if (existingHistory && existingHistory.length > 0) {
        const lastVisit = new Date(existingHistory[0].created_at);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastVisit.getTime()) / (1000 * 60);

        if (diffInMinutes < 30) {
          // Если прошло меньше 30 минут, просто возвращаем успех без вставки
          return res.status(200).json({ 
            success: true, 
            message: 'Прошло меньше 30 минут, история не дублируется' 
          });
        }
      }

      // 3. Если записей нет или прошло > 30 минут — вставляем новую
      const { error: insertError } = await supabase
        .from('history')
        .insert([{ user_id: userId, video_id: video_id }]);

      if (insertError) throw insertError;
      
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Неверный параметр g или метод' });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
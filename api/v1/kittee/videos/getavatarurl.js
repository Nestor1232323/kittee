export default function handler(req, res) {
  // Извлекаем параметр 'a' из строки запроса
  const { a } = req.query;

  // Базовый URL вашего Supabase Storage
  const supabaseUrl = process.env.kittee_SUPABASE_URL;

  if (!a) {
    return res.status(400).json({ error: 'Параметр "a" обязателен' });
  }

  // Формируем полный путь. 
  // Если 'a' уже содержит '/avatars/', мы просто конкатенируем.
  // Очищаем путь от лишних слешей, если они есть в начале переменной 'a'
  const cleanPath = a.startsWith('/') ? a.substring(1) : a;
  
  const redirectUrl = `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;

  // Отправляем 307 (Temporary Redirect) или 302
  res.redirect(307, redirectUrl);
}
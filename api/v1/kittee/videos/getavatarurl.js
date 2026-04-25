export default function handler(req, res) {
  // 1. Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // В продакшене лучше заменить на ваш домен
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Обрабатываем preflight-запрос (браузер отправляет его перед основным запросом)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { a } = req.query;
  const supabaseUrl = process.env.kittee_SUPABASE_URL;

  if (!a) {
    return res.status(400).json({ error: 'Параметр "a" обязателен' });
  }

  const cleanPath = a.startsWith('/') ? a.substring(1) : a;
  const redirectUrl = `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;

  // 3. Выполняем редирект
  res.redirect(307, redirectUrl);
}
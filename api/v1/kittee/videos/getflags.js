// Хелпер для парсинга кук из входящего запроса
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;

  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
  });
  return list;
}

export default async function handler(req, res) {
  // Настройка CORS флагов для работы с фронтендом kittee-videos.vercel.app и Vercel Toolbar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Быстрый ответ на preflight-запросы
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let flags = 'none';

  // 1. Извлекаем переопределения из куки Vercel Toolbar
  const cookies = parseCookies(req);
  const toolbarOverrides = cookies['__vercel_toolbar_overrides'];

  if (toolbarOverrides) {
    try {
      const parsed = JSON.parse(decodeURIComponent(toolbarOverrides));
      // Если объект содержит флаги, записываем их
      if (parsed && Object.keys(parsed).length > 0) {
        flags = parsed;
      }
    } catch (e) {
      console.error('Ошибка чтения куки флагов Vercel:', e.message);
    }
  }

  // 2. Если в куках пусто, проверяем системный bypass-токен/заголовок Vercel
  if (flags === 'none') {
    const bypassHeader = req.headers['x-vercel-protection-bypass'] || req.headers['x-vercel-set-bypass-cookie'];
    if (bypassHeader && bypassHeader !== '1') {
      try {
        // Если Vercel передал зашитую строку конфигурации, отдаем её
        flags = bypassHeader;
      } catch (e) {
        // Фоллбек на случай нечитаемого заголовка
      }
    }
  }

  // Возвращаем итоговый JSON со всеми флагами Vercel (или строку "none")
  return res.status(200).json(flags);
}

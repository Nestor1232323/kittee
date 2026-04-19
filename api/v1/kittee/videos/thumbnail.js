import http from 'http';

export default async function handler(req, res) {
const origin = req.headers.origin || '';
  // Разрешаем localhost (для отладки Flutter) и твой основной домен
  res.setHeader('Access-Control-Allow-Origin', '*'); // Или укажи конкретный домен
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка Preflight-запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { t } = req.query;

  if (!t) {
    return res.status(400).json({ error: "Missing thumbnail name (?t=...)" });
  }
  // Базовые URL твоих ресурсов
  const statusUrl = "http://k7videocdn1.medianewsonline.com/videos/status.json";
  const phpProxyUrl = "http://k7videocdn1.medianewsonline.com/get_thumbnail.php?n=";
  const placeholderUrl = "http://k7videocdn1.medianewsonline.com/get_thumbnail.php?n=placeholder.png";

  try {
    // 1. Проверяем статус (placeholder: true/false)
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    let targetUrl;

    if (statusData.status === "ok" && statusData.placeholder === true) {
      // Если включен режим заглушки
      targetUrl = placeholderUrl;
    } else {
      // Иначе идем через твой PHP прокси на хостинге
      targetUrl = `${phpProxyUrl}${t}`;
    }

    // 2. Делаем финальный запрос
    http.get(targetUrl, (proxyRes) => {
      // Проксируем статус ответа (200, 404 и т.д.)
      res.status(proxyRes.statusCode);
      
      // Проксируем тип контента (image/jpeg, и т.д.)
      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Добавляем кэширование, чтобы не мучить хостинг лишний раз
      res.setHeader('Cache-Control', 'public, max-age=1800');

      // Потоковая передача данных (pipe)
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.status(500).json({ error: "Hosting proxy error: " + e.message });
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to process thumbnail request" });
  }
}
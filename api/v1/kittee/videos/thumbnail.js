import http from 'http';

export default async function handler(req, res) {
  const { t } = req.query;

  if (!t) {
    return res.status(400).json({ error: "Missing thumbnail name (?t=...)" });
  }

  const baseCdnUrl = "http://k7videocdn1.medianewsonline.com/videos";

  try {
    // 1. Проверяем статус через JSON (используем fetch, он умеет в http)
    const statusRes = await fetch(`${baseCdnUrl}/status.json`);
    const statusData = await statusRes.json();

    let targetUrl;
    if (statusData.status === "ok" && statusData.placeholder === true) {
      targetUrl = `${baseCdnUrl}/placeholder.png`;
    } else {
      targetUrl = `${baseCdnUrl}/${t}`;
    }

    // 2. Проксируем само изображение через модуль http для стабильности
    http.get(targetUrl, (proxyRes) => {
      // Переносим статус и заголовки (Content-Type)
      res.status(proxyRes.statusCode);
      
      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Кэширование
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Перенаправляем поток данных (pipe) прямо в ответ
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.status(500).json({ error: "CDN connection error: " + e.message });
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to process request" });
  }
}
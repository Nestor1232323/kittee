import http from 'http';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { t } = req.query; // ID видео или имя превью
  
  // ТВОЙ НОВЫЙ ДОМЕН ИЗ ТУННЕЛЯ
  const homeServerUrl = "https://d9f144df278c8c.lhr.life/video/";

  try {
    // Формируем URL к твоему Go-серверу, который проксирует в RustFS
    const targetUrl = `${homeServerUrl}${t}/thumbnail.jpg`;

    http.get(targetUrl, (proxyRes) => {
      res.status(proxyRes.statusCode);
      const contentType = proxyRes.headers['content-type'];
      if (contentType) res.setHeader('Content-Type', contentType);
      
      res.setHeader('Cache-Control', 'public, max-age=1800');
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.status(500).json({ error: "Home Server Proxy Error: " + e.message });
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to process request" });
  }
}
import https from 'https'; // Используем https вместо http

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let { t } = req.query; 

  if (!t) {
    return res.status(400).json({ error: "Параметр t обязателен" });
  }

  // Очищаем t от ведущего слэша, если он есть, чтобы не было // в URL
  const cleanT = t.startsWith('/') ? t.substring(1) : t;
  
  // Твой URL туннеля (убедись, что он активен!)
  const homeServerUrl = "https://d9f144df278c8c.lhr.life/video/";

  // Формируем финальный URL. 
  // Если t это просто ID (например "1"), то добавляем /thumbnail.jpg
  // Если t это полный путь ("1/thumbnail.jpg"), используем как есть.
  const targetUrl = cleanT.includes('.jpg') 
    ? `${homeServerUrl}${cleanT}` 
    : `${homeServerUrl}${cleanT}/thumbnail.jpg`;

  try {
    https.get(targetUrl, (proxyRes) => {
      // Проверяем статус от домашнего сервера
      if (proxyRes.statusCode === 404) {
          return res.status(404).json({ error: "Thumbnail not found on home server" });
      }

      res.status(proxyRes.statusCode);
      
      const contentType = proxyRes.headers['content-type'];
      if (contentType) res.setHeader('Content-Type', contentType);
      
      res.setHeader('Cache-Control', 'public, max-age=1800');

      // Передаем поток данных
      proxyRes.pipe(res);
    }).on('error', (e) => {
      console.error(e);
      res.status(500).json({ error: "Home Server Connection Error: " + e.message });
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
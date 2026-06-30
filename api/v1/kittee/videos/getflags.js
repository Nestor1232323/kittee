export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel передает активные флаги в этом заголовке
  const vercelFlagsHeader = req.headers['x-vercel-flags'];

  if (vercelFlagsHeader) {
    try {
      // Декодируем строку флагов (Vercel кодирует их в base64 или URL-string)
      const decodedFlags = JSON.parse(Buffer.from(vercelFlagsHeader, 'base64').toString());
      return res.status(200).json(decodedFlags);
    } catch (e) {
      // Если это была обычная строка, а не base64 JSON
      return res.status(200).json(vercelFlagsHeader);
    }
  }

  // Если заголовка нет, значит флагов сейчас нет
  return res.status(200).json("none");
}

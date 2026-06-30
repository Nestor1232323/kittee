export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawCookies = req.headers.cookie || '';
  let flagsData = null;

  // Ищем куку флагов Vercel (Live Flags или Toolbar Overrides)
  const match = rawCookies.match(/__(vercel_live_flags|vercel_toolbar_overrides)=([^;]+)/);

  if (match && match[2]) {
    try {
      // Декодируем и парсим JSON, который прислал Vercel
      flagsData = JSON.parse(decodeURIComponent(match[2]));
    } catch (e) {
      // Если там просто строка
      flagsData = match[2];
    }
  }

  // Если флаги распарсились и это объект с ключами — отдаем его, иначе "none"
  const response = (flagsData && typeof flagsData === 'object' && Object.keys(flagsData).length > 0) 
    ? flagsData 
    : "none";

  return res.status(200).json(response);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const flags = {};

  // Перебираем все переменные из панели Vercel
  for (const key in process.env) {
    // Пропускаем системные служебные токены, чтобы не светить их
    if (
      key.includes('SECRET') || 
      key.includes('TOKEN') || 
      key.includes('KEY') || 
      key.includes('URL') ||
      key.startsWith('VERCEL_') && !key.includes('FLAG')
    ) {
      continue;
    }

    // Записываем значение (приводим строки 'true'/'false' к реальному boolean)
    let value = process.env[key];
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    flags[key] = value;
  }

  // Если нашли флаги — отдаем объект, если пусто — строку "none"
  const responseData = Object.keys(flags).length > 0 ? flags : "none";

  return res.status(200).json(responseData);
}

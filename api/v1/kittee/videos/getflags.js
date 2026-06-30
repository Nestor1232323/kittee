export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const flags = {};

  // Собираем вообще все флаги из системного окружения Vercel
  for (const key in process.env) {
    if (key.startsWith('FLAGS_') || key.startsWith('VERCEL_FLAGS')) {
      flags[key] = process.env[key];
    }
  }

  // Если объект пустой — выдает "none", если флаги есть — отдаем весь JSON
  const responseData = Object.keys(flags).length > 0 ? flags : "none";

  return res.status(200).json(responseData);
}

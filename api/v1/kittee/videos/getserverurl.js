export default function handler(request, response) {
  // Устанавливаем заголовки CORS
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); // Разрешить всем
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Обработка предварительного запроса (Preflight)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const data = {
    "status": "ok",
    "url": "cjaf579h46j2.shares.zrok.io"
  };

  return response.status(200).json(data);
}
export default function handler(request, response) {
  const data = {
    "status": "ok",
    "url": "d9f144df278c8c.lhr.life"
  };

  response.status(200).json(data);
}
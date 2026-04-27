import { createClient } from '@supabase/supabase-js';

// 1. Проверяем инициализацию (не пустые ли ключи)
const supabaseUrl = process.env.kittee_SUPABASE_URL;
const supabaseKey = process.env.kittee_SUPABASE_SERVICE_ROLE_KEY;

console.log("--- DEBUG START ---");
console.log("Supabase URL present:", !!supabaseUrl);
console.log("Supabase Key present:", !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { id } = req.query; 

  console.log("Request ID from query:", id);
  console.log("Request Method:", req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 2. Логируем сам запрос перед отправкой
    console.log(`Fetching video with id: ${id}...`);

    const { data, error, status, statusText } = await supabase
      .from('videos')
      .select(`
        *,
        users (
          username,
          avatar_url,
          avatar_shape,
          name,
          verified
        )
      `)
      .eq('id', id)
      .single();

    // 3. Смотрим, что ответил Supabase
    if (error) {
      console.error("Supabase Error Object:", JSON.stringify(error, null, 2));
      console.error("HTTP Status:", status, statusText);
      return res.status(status || 500).json({ 
        error: "Supabase error", 
        details: error.message,
        hint: error.hint 
      });
    }

    if (!data) {
      console.warn("No data returned for ID:", id);
      return res.status(404).json({ error: "Video not found in DB" });
    }

    console.log("Data successfully fetched for:", data.id);

    const formattedVideo = {
      ...data,
      username: data.users?.username,
      avatar_url: data.users?.avatar_url,
      avatar_shape: data.users?.avatar_shape || 'circle',
      name: data.users?.name,
      verified: data.users?.verified,
    };
    delete formattedVideo.users;

    console.log("--- DEBUG END ---");
    return res.status(200).json(formattedVideo);

  } catch (err) {
    console.error("Global Catch Error:", err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
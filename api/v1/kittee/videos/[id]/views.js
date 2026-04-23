import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.kittee_SUPABASE_URL, process.env.kittee_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // В Supabase инкремент делается через rpc или фильтрованный апдейт
    // Используем rpc 'increment_views', если создана функция в БД, 
    // либо простой запрос:
    
    const { data, error } = await supabase
      .rpc('increment_views', { video_id: id }); 
      
    // Если rpc не создана, можно сделать так:
    /*
    const { data: video } = await supabase.from('videos').select('views').eq('id', id).single();
    const { data: updated } = await supabase
      .from('videos')
      .update({ views: (video.views || 0) + 1 })
      .eq('id', id)
      .select('views')
      .single();
    */

    if (error) throw error;

    return res.status(200).json({
      status: true,
      video_id: id,
      views: data // или updated.views
    });

  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
}
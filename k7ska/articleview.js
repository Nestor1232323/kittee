const SUPABASE_URL = 'https://gytqslhsqampwlzapdty.supabase.co/rest/v1/articles';
const SUPABASE_KEY = process.env.SUPABASE_KEY; 

module.exports = async (req, res) => {
    // Безопасно разбираем URL в формате /articleview/category/name или /articleview/name
    const urlPath = req.url.split('?')[0]; 
    const cleanPath = urlPath.replace(/^\/articleview\//, '');
    const parts = cleanPath.split('/').filter(Boolean);

    let category = null;
    let name = null;

    if (parts.length === 2) {
        category = parts[0];
        name = parts[1];
    } else if (parts.length === 1) {
        name = parts[0];
    }

    if (!name) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>404 — Неверный URL</h1>');
    }

    try {
        let targetUrl = `${SUPABASE_URL}?name=eq.${encodeURIComponent(name)}`;
        if (category) {
            targetUrl += `&category=eq.${encodeURIComponent(category)}`;
        }

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<h1>Статья не найдена</h1>');
        }

        const article = data[0];
        const rawMarkdown = article.content || '# Статья пустая';

        // Ищем title из первой строчки с решеткой # на сервере для тега <title>
        const match = rawMarkdown.match(/^#\s+(.+)$/m);
        const displayTitle = match ? match[1].trim() : name;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${displayTitle}</title>
                
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@example/water.css@2/out/water.css">
                
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                
                <style>
                    body { max-width: 800px; margin: 40px auto; padding: 0 20px; }
                    .meta { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
                    pre { padding: 1em; overflow-x: auto; background: #f4f4f4; border-radius: 4px; }
                    blockquote { border-left: 4px solid #ccc; padding-left: 15px; margin-left: 0; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; }
                </style>
            </head>
            <body>
                <div class="meta">
                    Категория: <strong>${article.category || 'Без категории'}</strong>
                </div>
                <hr>
                
                <article id="content">Загрузка статьи...</article>

                <script type="text/plain" id="raw-markdown">${rawMarkdown.replace(/<\/script>/g, '<\\/script>')}</script>

                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        const rawMd = document.getElementById('raw-markdown').textContent;
                        // Запускаем полную обработку Markdown (включая таблицы GFM)
                        document.getElementById('content').innerHTML = marked.parse(rawMd);
                    });
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Внутренняя ошибка сервера</h1>');
    }
};

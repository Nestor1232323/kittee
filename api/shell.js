// это нужно тупо чтобы проверить мои инструменты
import { exec } from 'child_process';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { command } = req.body;
    
    return exec(command, (error, stdout, stderr) => {
      res.status(200).json({
        output: stdout || '',
        error: stderr || (error ? error.message : '')
      });
    });
  }

  // 2. Выдача HTML-интерфейса (GET запрос)
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vercel Direct Shell</title>
      <style>
        body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
        #output { white-space: pre-wrap; margin-bottom: 10px; }
        #input-line { display: flex; }
        input { background: none; border: none; color: #0f0; outline: none; flex: 1; font-family: monospace; font-size: 16px; }
        span { margin-right: 10px; color: #fff; }
      </style>
    </head>
    <body>
      <div id="output">Vercel Shell. Вводи команды (например: ls, node -v, env)</div>
      <div id="input-line">
        <span>$</span>
        <input type="text" id="cmd" autofocus>
      </div>

      <script>
        const input = document.getElementById('cmd');
        const output = document.getElementById('output');

        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            const command = input.value;
            output.innerHTML += '\\n<span style="color:#fff">$ ' + command + '</span>\\n';
            input.value = '';

            const res = await fetch('/api/shell', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command })
            });
            
            const data = await res.json();
            if (data.output) output.innerHTML += data.output;
            if (data.error) output.innerHTML += '<span style="color:red">' + data.error + '</span>';
            
            window.scrollTo(0, document.body.scrollHeight);
          }
        });
      </script>
    </body>
    </html>
  `);
}
require('dotenv').config();
const http = require('http');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3579;

if (!TOKEN || !CHAT_ID) {
    console.error('Error: BOT_TOKEN and CHAT_ID must be set in .env');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// HTTP-сервер для приёма задач из браузерного расширения
const server = http.createServer((req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200);
        res.end('pong');
        return;
    }

    if (req.method === 'POST' && req.url === '/schedule') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { movie, scheduledAt } = data;

                if (!movie || !scheduledAt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing movie or scheduledAt' }));
                    return;
                }

                // Форматируем выбранную дату для вывода в сообщении
                const dateObj = new Date(scheduledAt);
                const dateStr = dateObj.toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                // Формируем текст анонса
                // Экранируем символы MarkdownV2 если нужно, или используем обычный Markdown
                const caption = `🎬 *${movie.name}* ${movie.year ? `(${movie.year})` : ''}\n\n🗓 *Запланировано на:* ${dateStr}\n\n${movie.description || ''}`;

                if (movie.posterUrl) {
                    await bot.sendPhoto(CHAT_ID, movie.posterUrl, {
                        caption: caption,
                        parse_mode: 'Markdown'
                    });
                } else {
                    await bot.sendMessage(CHAT_ID, caption, {
                        parse_mode: 'Markdown'
                    });
                }

                console.log(`[Bot] Sent announcement: ${movie.name} for ${dateStr}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('[Bot] Error sending to Telegram:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HTTP] Server running at http://127.0.0.1:${PORT}/`);
    console.log(`[Bot] Connected to Telegram. Ready to send announcements!`);
});

const TelegramBot = require('node-telegram-bot-api');

// Отключаем polling (для Serverless функций он не нужен и вреден)
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

module.exports = async (req, res) => {
    // Включаем CORS для запросов из браузерного расширения
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Предзапрос (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ping для проверки статуса бота
    if (req.method === 'GET') {
        return res.status(200).send('pong');
    }

    if (req.method === 'POST') {
        // Простая защита от спама с других сайтов
        const authHeader = req.headers.authorization;
        const secret = process.env.API_SECRET;
        
        // Проверяем секрет только если он задан в Vercel
        if (secret && authHeader !== `Bearer ${secret}`) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API_SECRET' });
        }

        try {
            const { movie, scheduledAt } = req.body;
            if (!movie || !scheduledAt) {
                return res.status(400).json({ error: 'Missing movie or scheduledAt' });
            }

            const dateObj = new Date(scheduledAt);
            const dateStr = dateObj.toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const caption = `🎬 *${movie.name}* ${movie.year ? `(${movie.year})` : ''}\n\n🗓 *Запланировано на:* ${dateStr}\n\n${movie.description || ''}`;
            const CHAT_ID = process.env.CHAT_ID;

            // Отправляем сообщение в Телеграм
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

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[Bot] Error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(404).json({ error: 'Not found' });
};

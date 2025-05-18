const dbQueries = require('./db/db.queries');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const botToken = '8064015461:AAEktPr9S1AOd_EZB4YgS6MBwtdVv08-iEY'; // Замените на ваш токен бота
const bot = new TelegramBot(botToken, { polling: false }); // Webhooks
const app = express();
const port = process.env.PORT || 3000;
const host = 'telegram-tattoo-bot.onrender.com'; // Замените на ваш домен

app.use(bodyParser.json());

// Webhook endpoint
app.post('/bot', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

//  Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Я бот вашей тату-студии. Как я могу вам помочь?');
});

//  Обработчик текстовых сообщений (Echo bot - отвечает на все сообщения)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    bot.sendMessage(chatId, `Вы написали: ${text}`); // Просто повторяем сообщение

    //  Здесь можно добавить логику обработки сообщений, например:
    //  - Запрос информации о тату-салоне
    //  - Запись на консультацию (интеграция с вашим сайтом)
    //  - Ответы на часто задаваемые вопросы
});

//  Обработчик ошибок
bot.on('polling_error', (error) => {
    console.log(error); // Log the error
});
const webhookUrl = `https://${host}/bot`;
// Запускаем сервер (независимо от установки webhook)
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

// Пытаемся установить webhook (только один раз!)
bot.setWebHook(webhookUrl).then(() => {
    console.log('Webhook установлен');
}).catch((error) => {
    console.error('Не удалось установить webhook:', error);
});

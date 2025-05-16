const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const botToken = '8064015461:AAEktPr9S1AOd_EZB4YgS6MBwtdVv08-iEY'; // Замените на ваш токен бота
const bot = new TelegramBot(botToken, { polling: false }); // Webhooks
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Webhook endpoint
app.post('/bot' + botToken, (req, res) => {
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

// Set webhook
bot.setWebHook('https://suvorov-studio.onrender.com/bot' + botToken) // Replace your-app-name
    .then(() => {
        app.listen(port, () => {
            console.log(`Сервер запущен на порту ${port}`);
        });
        console.log('WebHook настроен');
    })
    .catch(err => {
        console.log('Ошибка установки WebHook' + err);
    });
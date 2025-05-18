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
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;

    try {
        // Ищем пользователя в базе данных
        let user = await dbQueries.findUserByTelegramId(telegramId);

        if (!user) {
            // Если пользователя нет, создаем его
            user = await dbQueries.createUser(telegramId, username, firstName, lastName);
            await bot.sendMessage(chatId, `Привет, ${firstName}! Рады видеть тебя в нашем боте.`);
        } else {
            await bot.sendMessage(chatId, `Привет, ${firstName}! С возвращением!`);
        }

    } catch (error) {
        console.error("Ошибка при обработке команды /start:", error);
        await bot.sendMessage(chatId, "Произошла ошибка при обработке команды /start. Пожалуйста, попробуйте позже.");
    }
});

//  Обработчик текстовых сообщений (Echo bot - отвечает на все сообщения)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
        // Находим пользователя в базе данных (предполагаем, что он уже зарегистрирован через /start)
        let user = await dbQueries.findUserByTelegramId(userId);

        if (!user) {
            await bot.sendMessage(chatId, "Пожалуйста, сначала зарегистрируйтесь, используя команду /start.");
            return;
        }
        // Сохраняем текст сообщения пользователя
        await dbQueries.saveUserData(user.id, 'last_message', text);
        await bot.sendMessage(chatId, `Вы написали: ${text} (Сохранено в базе данных)`);

    } catch (error) {
        console.error("Ошибка при обработке сообщения:", error);
        await bot.sendMessage(chatId, "Произошла ошибка при обработке сообщения. Пожалуйста, попробуйте позже.");
    }
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

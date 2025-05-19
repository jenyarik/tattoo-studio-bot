const dbQueries = require('./db/db.queries');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const botToken = process.env.BOT_TOKEN; // Используем переменную окружения для токена
const bot = new TelegramBot(botToken, { polling: false });
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST; // Используем переменную окружения для хоста
const webhookUrl = `https://${host}/bot`;

app.use(bodyParser.json());

app.post('/bot', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Обработчик команды /start и регистрации в одном
bot.onText(/\/start|\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;

    try {
        let user = await dbQueries.findUserByTelegramId(telegramId);

        if (user) {
            await bot.sendMessage(chatId, `Привет, ${firstName}! С возвращением!`);
        } else {
            // Запрашиваем данные для регистрации
            await bot.sendMessage(
                chatId,
                `Привет! Для регистрации отправьте данные в формате:\n` +
                `id или номер телефона, имя, почта\n` +
                `Пример: 89221543360, Иван, ivan@example.com`
            );
        }
    } catch (error) {
        console.error("Ошибка при обработке команды /start или /register:", error);
        await bot.sendMessage(
            chatId,
            "Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже."
        );
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
        let user = await dbQueries.findUserByTelegramId(userId);

        if (!user) {
            // Попытка регистрации, если пользователь не найден
            const registrationData = text.split(',').map(item => item.trim());

            if (registrationData.length === 3) {
                const [identifier, name, email] = registrationData;

                // Проверяем, является ли identifier числом (id или телефон)
                if (!isNaN(identifier)) {
                    // Успешная регистрация
                    user = await dbQueries.createUser(userId, username, name, email);

                    // Отправляем сообщение клиенту (в index.html) об успешной регистрации
                    res.json({ response: `Регистрация прошла успешно!\nВаше имя: ${name}\nВаш email: ${email}` });
                    return; //  Важно: Прекращаем дальнейшее выполнение функции
                } else {
                    // Отправляем сообщение клиенту (в index.html) о неверном формате данных
                    res.json({
                        response: `Неверный формат данных. Пожалуйста, отправьте данные в формате:\n` +
                        `id или номер телефона, имя, почта\n` +
                        `Пример: 89221543360, Иван, ivan@example.com`
                    });
                    return; //  Важно: Прекращаем дальнейшее выполнение функции
                }
            } else {
                // Отправляем сообщение клиенту (в index.html) о неверном формате данных
                res.json({
                    response: `Неверный формат данных. Пожалуйста, отправьте данные в формате:\n` +
                    `id или номер телефона, имя, почта\n` +
                    `Пример: 89221543360, Иван, ivan@example.com`
                });
                return; //  Важно: Прекращаем дальнейшее выполнение функции
            }
        }
        // Пользователь зарегистрирован, сохраняем сообщения
        else {
            await dbQueries.saveBotMessage(user.id, chatId, text); // Сохраняем сообщение в bot_messages
            await dbQueries.saveUserData(user.id, 'last_message', text);
            // Отправляем клиенту (в index.html) эхо-сообщение
            res.json({ response: `Вы написали: ${text} (Сохранено в базе данных)` });
            return; //  Важно: Прекращаем дальнейшее выполнение функции
        }
    } catch (error) {
        console.error("Ошибка при обработке сообщения:", error);
        // Отправляем клиенту (в index.html) сообщение об ошибке
        res.status(500).json({ response: "Произошла ошибка при обработке сообщения. Пожалуйста, попробуйте позже." });
        return; //  Важно: Прекращаем дальнейшее выполнение функции
    }
});
// Добавляем обработку сообщений для панели администратора
app.get('/get-bot-messages', async (req, res) => {
    try {
        //  Выполняем SQL-запрос для получения сообщений из таблицы bot_messages
        const messages = await dbQueries.getBotMessages();
        res.json(messages); //  Отправляем сообщения в формате JSON
    } catch (error) {
        console.error('Ошибка при получении сообщений бота из базы данных:', error);
        res.status(500).send('Ошибка при получении сообщений бота.');
    }
});

bot.on('polling_error', (error) => {
    console.log(error);
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

bot.setWebHook(webhookUrl)
    .then(() => {
        console.log('Webhook установлен');
    })
    .catch((error) => {
        console.error('Не удалось установить webhook:', error);
    });

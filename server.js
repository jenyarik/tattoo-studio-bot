// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db.queries.js');
const cors = require('cors');

const app = express();

// Настройка CORS
const corsOptions = {
    origin: 'https://suvorov-studio.onrender.com',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Helper function to handle errors ---
function handleServerError(res, error, message = 'Произошла ошибка сервера') {
    console.error(message + ':', error);
    res.status(500).json({ message: message, error: error.message });
}

// --- Обработка сообщений от пользователя ---
async function handleUserMessage(userId, text) {
    console.log(`handleUserMessage called with text: "${text}" from user ${userId}`);

    const lowerCaseText = text.toLowerCase().trim();
    const welcomeMessage = `👋 Приветствую! Я Чат-бот "Студии Суворова".
        Я могу помочь тебе с:
        - Регистрацией:  зарегистрироваться [имя пользователя] [email] [пароль] [телефон]
        - Входом в систему: войти [email] [пароль]
        - Просмотром списка мастеров: мастера
        - Просмотром списка услуг: услуги
        - Записью на прием: записаться [дата] [время] [мастер] [услуга]
        Чтобы начать, просто введи нужную команду!`;

    try {
        if (lowerCaseText === 'мастера') {
            const masters = await dbQueries.getMasters();
            if (masters && masters.length > 0) {
                let response = "Список мастеров:\n";
                masters.forEach(master => {
                    response += `- ${master.name} (${master.specialization})\n`;
                });
                return response;
            } else {
                return "К сожалению, список мастеров пуст.";
            }
        } else if (lowerCaseText === 'услуги') {
            const services = await dbQueries.getServices();
            if (services && services.length > 0) {
                let response = "Список услуг:\n";
                services.forEach(service => {
                    response += `- ${service.name} - ${service.description} - ${service.price}\n`;
                });
                return response;
            } else {
                return "К сожалению, список услуг пуст.";
            }
        } else if (lowerCaseText.startsWith('записаться')) {
            const parts = lowerCaseText.split(' ');
            if (parts.length < 5) {
                return "Неверный формат команды 'записаться'. Используйте: записаться [дата] [время] [мастер] [услуга]";
            }
            const [_, date, time, masterName, serviceName] = parts;

            const master = await dbQueries.getMasterByName(masterName);
            const service = await dbQueries.getServiceByName(serviceName);

            if (!master || !service) {
                return "Не удалось найти мастера или услугу.";
            }

            const appointment = await dbQueries.createAppointment(userId, service.service_id, master.master_id, date, time);
            return `Вы записаны к мастеру ${master.name} на ${date} в ${time}.`;

        } else if (lowerCaseText.startsWith('зарегистрироваться')) {
            const parts = text.split(' ');
            if (parts.length < 5) {
                return "Неверный формат команды зарегистрироваться. Используйте: зарегистрироваться [имя пользователя] [email] [пароль] [телефон]";
            }
            const [_, username, email, password, phone] = parts;
            try {
                const newUser = await dbQueries.createUser(username, email, password, phone); // Пароль теперь хранится в открытом виде!
                console.log("New user created:", newUser);
                return "Регистрация успешна!";
            } catch (error) {
                console.error("Error registering user:", error);
                if (error.constraint === 'users_email_key') {
                    return "Пользователь с таким email уже существует.";
                }
                return "Произошла ошибка при регистрации.";
            }
        } else if (lowerCaseText.startsWith('войти')) {
            console.log("Processing 'войти' command");
            const parts = text.split(' ');
            if (parts.length < 3) {
                return "Неверный формат команды войти. Используйте: войти [email] [пароль]";
            }
            const [_, email, password] = parts;

            try {
                const user = await dbQueries.getUserByEmail(email);
                if (!user) {
                    return "Пользователь с таким email не найден.";
                }

                //  СРАВНИВАЕМ ПАРОЛЬ В ОТКРЫТОМ ВИДЕ!
                if (password !== user.password) {  // Сравниваем пароли напрямую (ОЧЕНЬ НЕБЕЗОПАСНО!)
                    return "Неверный пароль.";
                }

                console.log("Login successful:", user);
                return "Вход выполнен!";

            } catch (error) {
                console.error("Error logging in:", error);
                return "Произошла ошибка при входе.";
            }
        }
        else {
            return `Вы сказали: ${text}`;
        }

    } catch (error) {
        console.error("Ошибка при обработке команды:", error);
        return "Произошла ошибка при обработке вашей команды.";
    }
}


// --- Эндпоинты ---
app.post('/api/message', async (req, res) => {
    const { text, userId } = req.body;
    console.log('Получено сообщение:', text, 'от пользователя:', userId);

    try {
        const botResponse = await handleUserMessage(userId, text);
        await dbQueries.saveBotMessage(userId, botResponse);
        console.log("Bot message saved");
        res.setHeader('Content-Type', 'application/json');
        res.json({ response: botResponse });

    } catch (error) {
        handleServerError(res, error, "Ошибка при обработке сообщения");
    }
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await dbQueries.query('SELECT NOW()');
        res.json({ message: 'Подключение к БД успешно!', timestamp: result.rows[0].now });
    } catch (error) {
        handleServerError(res, error, "Ошибка подключения к БД");
    }
});

app.get('/init', async (req, res) => {
    const welcomeMessage = `👋 Приветствую! Я Чат-бот "Студии Суворова".
        Я могу помочь тебе с:
        - Регистрацией:  зарегистрироваться [имя пользователя] [email] [пароль] [телефон]
        - Входом в систему: войти [email] [пароль]
        - Просмотром списка мастеров: мастера
        - Просмотром списка услуг: услуги
        - Записью на прием: записаться [дата] [время] [мастер] [услуга]
        Чтобы начать, просто введи нужную команду!`;
    try {
        res.json({ response: welcomeMessage });
    } catch (error) {
        handleServerError(res, error, "Произошла ошибка при отправке приветственного сообщения.");
    }
});

app.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    try {
        const newUser = await dbQueries.createUser(username, email, password, phone); // Пароль теперь хранится в открытом виде!
        res.status(201).json({ message: 'Пользователь успешно создан', user: newUser });
    } catch (error) {
        handleServerError(res, error, "Ошибка при регистрации пользователя");
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbQueries.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь с таким email не найден.' });
        }

        // СРАВНИВАЕМ ПАРОЛЬ В ОТКРЫТОМ ВИДЕ!
        if (password !== user.password) { // Сравниваем пароли напрямую (ОЧЕНЬ НЕБЕЗОПАСНО!)
            return res.status(401).json({ message: 'Неверный пароль.' });
        }

        res.json({ message: 'Вход выполнен!', user: { user_id: user.user_id, username: user.username, email: user.email } });
    } catch (error) {
        handleServerError(res, error, "Ошибка при входе пользователя");
    }
});

app.get('/services', async (req, res) => {
    try {
        const services = await dbQueries.getServices();
        res.json(services);
    } catch (error) {
        handleServerError(res, error, "Ошибка при получении списка услуг");
    }
});

app.get('/masters', async (req, res) => {
    try {
        const masters = await dbQueries.getMasters();
        res.json(masters);
    } catch (error) {
        handleServerError(res, error, "Ошибка при получении списка мастеров");
    }
});

app.post('/appointments', async (req, res) => {
    const { userId, serviceId, masterId, appointmentDate, appointmentTime } = req.body;
    try {
        const newAppointment = await dbQueries.createAppointment(userId, serviceId, masterId, appointmentDate, appointmentTime);
        res.status(201).json({ message: 'Запись успешно создана', appointment: newAppointment });
    } catch (error) {
        handleServerError(res, error, "Ошибка при создании записи на прием");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

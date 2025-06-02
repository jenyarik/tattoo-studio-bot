// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db.queries.js'); //  Импортируем db.queries.js
const cors = require('cors');
const bcrypt = require('bcrypt');
const { getMasters, getServices, createAppointment, getMasterByName, getServiceByName, saveBotMessage } = require('./db.queries.js');

const app = express();
// Настройка CORS
const corsOptions = {
    origin: 'https://suvorov-studio.onrender.com', // Разрешить запросы только с этого домена
    optionsSuccessStatus: 200 // Для старых браузеров
};
app.use(cors(corsOptions));
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//  Обработка сообщений от пользователя
async function handleUserMessage(userId, text) {
    console.log(`handleUserMessage called with text: "${text}"`); //  Добавь эту строку
    console.log(`Обработка сообщения "${text}" от пользователя ${userId}`);

 const lowerCaseText = text.toLowerCase().trim(); // Добавляем trim() для удаления пробелов
    const welcomeMessage = `
        👋 Приветствую! Я Чат-бот "Студии Суворова".
       \n Я могу помочь тебе с:
       \n - Регистрацией:  зарегистрироваться [имя пользователя] [email] [пароль] [телефон]
       \n - Входом в систему: войти [email] [пароль]
       \n - Просмотром списка мастеров: мастера
       \n - Просмотром списка услуг: услуги
       \n - Записью на прием: записаться [дата] [время] [мастер] [услуга]
        
       \n Чтобы начать, просто введи нужную команду!`;

    try {
        if (lowerCaseText === 'мастера') {
            const masters = await dbQueries.getMasters();
            if (masters && masters.length > 0) {
                let response = "Список мастеров:\n";
                masters.forEach(master => {
                    response += `- ${master.name} (${master.specialization})\n`; //  Замени на фактические поля
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
                    response += `- ${service.name} - ${service.description} - ${service.price}\n`; //  Замени на фактические поля
                });
                return response;
            } else {
                return "К сожалению, список услуг пуст.";
            }
        } else if (lowerCaseText.startsWith('записаться')) {
            //  Парсим команду "записаться"
            const parts = lowerCaseText.split(' ');
            if (parts.length < 5) {
                return "Неверный формат команды 'записаться'. Используйте: записаться [дата] [время] [мастер] [услуга]";
            }
            const [_, date, time, masterName, serviceName] = parts;

            //  Получаем ID мастера и услуги (используем dbQueries)
            const master = await dbQueries.getMasterByName(masterName); // Добавь эту функцию в dbQueries
            const service = await dbQueries.getServiceByName(serviceName); // Добавь эту функцию в dbQueries

            if (!master || !service) {
                return "Не удалось найти мастера или услугу.";
            }

            //  Создаем запись
            const appointment = await dbQueries.createAppointment(userId, service.service_id, master.master_id, date, time); //  Добавь эту функцию в dbQueries
            return `Вы записаны к мастеру ${master.name} на ${date} в ${time}.`;

        } else if (lowerCaseText.startsWith('зарегистрироваться')) { // Обработка команды /register
            const parts = text.split(' ');
            if (parts.length < 5) {
                return "Неверный формат команды зарегистрироваться. Используйте: зарегистрироваться [имя пользователя] [email] [пароль] [телефон]";
            }
            const [_, username, email, password, phone] = parts;
            try {
                // Хеширование пароля
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);
                // Вызываем функцию createUser из db.queries
                const newUser = await dbQueries.createUser(username, email, passwordHash, phone);
                console.log("New user created:", newUser);
                return "Регистрация успешна!"; // Ответ пользователю
            } catch (error) {
                console.error("Error registering user:", error);
                // Обрабатываем ошибки, например, если email уже существует
                if (error.constraint === 'users_email_key') { // Пример обработки ошибки уникальности email
                    return "Пользователь с таким email уже существует.";
                }
                return "Произошла ошибка при регистрации.";
            }
        } else if (lowerCaseText.startsWith('войти')) { // Обработка команды /login
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

                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                if (!passwordMatch) {
                    return "Неверный пароль.";
                }

                //  Успешный вход.  (Здесь ты можешь реализовать сессии или JWT)
                console.log("Login successful:", user);
                return "Вход выполнен!"; //  Сообщение об успешном входе

            } catch (error) {
                console.error("Error logging in:", error);
                return "Произошла ошибка при входе.";
            }
        }
        else {
            return `Вы сказали: ${text}`; //  Ответ по умолчанию
        }

    } catch (error) {
        console.error("Ошибка при обработке команды:", error);
        return "Произошла ошибка при обработке вашей команды.";
    }
}

app.post('/api/message', async (req, res) => {
    const { text, userId } = req.body;
    // Обработка сообщения пользователя
    console.log('Получено сообщение:', text, 'от пользователя:', userId);
    //  Вызываем функцию обработки сообщения бота
    const botResponse = await handleUserMessage(userId, text);
    //  Сохраняем сообщение бота
    try {
        await saveBotMessage(userId, botResponse);  //  <-- Добавь это
        console.log("Bot message saved");
    } catch (error) {
        console.error("Error saving bot message:", error);
    }
    res.setHeader('Content-Type', 'application/json');  //  <--- Добавлено
    res.json({ response: botResponse });
});

//  Эндпоинт для проверки подключения к базе данных
app.get('/test-db', async (req, res) => {
    try {
        const result = await dbQueries.query('SELECT NOW()'); // Простой запрос к БД
        res.json({ message: 'Подключение к БД успешно!', timestamp: result.rows[0].now });
    } catch (error) {
        console.error("Ошибка подключения к БД:", error);
        res.status(500).json({ message: 'Ошибка подключения к БД', error: error.message });
    }
});

//  Добавим отправку приветственного сообщения при загрузке страницы
app.get('/init', async (req, res) => { //  Новый эндпоинт - `/init`
    const userId = '123'; // Замените на реальный userId, если это необходимо
    const welcomeMessage = `
        👋 Приветствую! Я Чат-бот "Студии Суворова".
       \n Я могу помочь тебе с:
       \n - Регистрацией:  зарегистрироваться [имя пользователя] [email] [пароль] [телефон]
       \n - Входом в систему: войти [email] [пароль]
       \n - Просмотром списка мастеров: мастера
       \n - Просмотром списка услуг: услуги
       \n - Записью на прием: записаться [дата] [время] [мастер] [услуга]
        
       \n Чтобы начать, просто введи нужную команду!`;
    try {
        res.json({ response: welcomeMessage }); // Отправляем приветственное сообщение в ответ
    } catch (error) {
        console.error("Error sending welcome message:", error);
        res.status(500).json({ error: "Произошла ошибка при отправке приветственного сообщения." });
    }
});

// Ендпоинт для регистрации пользователя
app.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    try {
        //  Хеширование пароля
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const newUser = await dbQueries.createUser(username, email, passwordHash, phone);
        res.status(201).json({ message: 'Пользователь успешно создан', user: newUser });
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        res.status(500).json({ message: 'Ошибка при создании пользователя', error: error.message });
    }
});

// Ендпоинт для входа пользователя
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbQueries.getUserByEmail(email);
        if (user) {
            //  Сравниваем пароль с хешем в бд
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (passwordMatch) {
                res.json({ message: 'Вход выполнен!', user: { user_id: user.user_id, username: user.username, email: user.email } });
            } else {
                res.status(401).json({ message: 'Неверный пароль.' });
            }
        } else {
            res.status(404).json({ message: 'Пользователь с таким email не найден.' });
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
        res.status(500).json({ message: 'Ошибка при входе', error: error.message });
    }
});

//  Ендпоинт для получения списка услуг
app.get('/services', async (req, res) => {
    try {
        const services = await dbQueries.getServices();
        res.json(services);
    } catch (error) {
        console.error("Ошибка при получении списка услуг:", error);
        res.status(500).json({ message: 'Ошибка при получении списка услуг', error: error.message });
    }
});

// Ендпоинт для получения списка мастеров
app.get('/masters', async (req, res) => {
    try {
        const masters = await dbQueries.getMasters();
        res.json(masters);
    } catch (error) {
        console.error("Ошибка при получении списка мастеров:", error);
        res.status(500).json({ message: 'Ошибка при получении списка мастеров', error: error.message });
    }
});

// Ендпоинт для создания записи на прием
app.post('/appointments', async (req, res) => {
    const { userId, serviceId, masterId, appointmentDate, appointmentTime } = req.body;
    try {
        const newAppointment = await dbQueries.createAppointment(userId, serviceId, masterId, appointmentDate, appointmentTime);
        res.status(201).json({ message: 'Запись успешно создана', appointment: newAppointment });
    } catch (error) {
        console.error("Ошибка при создании записи:", error);
        res.status(500).json({ message: 'Ошибка при создании записи', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

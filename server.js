// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db.queries');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express(); //  <--  Сначала инициализируем app

// Настройка CORS
const corsOptions = {
  origin: 'https://suvorov-studio.onrender.com', // Разрешить запросы только с этого домена
  optionsSuccessStatus: 200 // Для старых браузеров
};

app.use(cors(corsOptions)); //  <-- Используем cors с опциями

const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// ========================================================================
//  Эндпоинты API
// ========================================================================
// server.js
app.post('/api/message', async (req, res) => {
    const { text, userId } = req.body;

    // Обработка сообщения пользователя
    console.log('Получено сообщение:', text, 'от пользователя:', userId);

    // Тут можно вызвать функцию обработки сообщения бота
    const botResponse = await handleUserMessage(userId, text);

    res.setHeader('Content-Type', 'application/json');  // <--- Добавь эту строку
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

// Ендпоинт для регистрации пользователя
app.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    try {
        //  Хеширование пароля (с использованием bcrypt)
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
            //  Сравниваем пароль с хешем в базе данных
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

// Ендпоинт для получения списка услуг
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

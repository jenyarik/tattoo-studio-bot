require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db.queries.js');
const cors = require('cors');

const app = express();

// Настройка CORS
const corsOptions = {
    origin: 'https://suvorov-studio.onrender.com', //  Укажи свой домен
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware для проверки, что пользователь вошел в систему (очень простой)
let loggedInUserId = null; //  Переменная для хранения ID вошедшего пользователя

function requireLogin(req, res, next) {
    if (!loggedInUserId) {
        return res.status(401).json({ message: 'Требуется войти в систему.' });
    }
    next();
}

// Обработка сообщений от пользователя
async function handleUserMessage(text, userId) {
    console.log(`handleUserMessage called with text: "${text}" and userId: "${userId}"`);

    const lowerCaseText = text.toLowerCase().trim();
    const welcomeMessage = `
        👋 Приветствую! Я Чат-бот "Студии Суворова".<br>
        Я могу помочь тебе с:<br>
        - Регистрацией: зарегистрироваться [имя пользователя], [email,пароль,телефон]<br>
        - Входом в систему: войти [email] [пароль]<br>
        - Просмотром списка мастеров: мастера<br>
        - Просмотром списка услуг: услуги<br>
        - Записью на прием: записаться [дата] [время], [мастер,услуга]<br>
        
        Чтобы начать, просто введи нужную команду!`;

    let botResponse = null;

    if (lowerCaseText === 'мастера') {
        try {
            const masters = await dbQueries.getMasters();
            if (masters && masters.length > 0) {
                let response = "Список мастеров:\n";
                masters.forEach(master => {
                    response += `- ${master.name} (${master.specialization})\n`;
                });
                botResponse = response;
            } else {
                botResponse = "К сожалению, список мастеров пуст.";
            }
        } catch (error) {
            console.error("Ошибка при получении списка мастеров:", error);
            botResponse = "Произошла ошибка при получении списка мастеров.";
        }
    }

    if (lowerCaseText === 'услуги') {
        try {
            const services = await dbQueries.getServices();
            if (services && services.length > 0) {
                let response = "Список услуг:\n";
                services.forEach(service => {
                    response += `- ${service.name} - ${service.description} - ${service.price}\n`;
                });
                botResponse = response;
            } else {
                botResponse = "К сожалению, список услуг пуст.";
            }
        } catch (error) {
            console.error("Ошибка при получении списка услуг:", error);
            botResponse = "Произошла ошибка при получении списка услуг.";
        }
    }

    if (lowerCaseText.startsWith('записаться')) {
        const commandBody = lowerCaseText.slice('записаться'.length).trim();
        // Разделяем по запятым
        const parts = commandBody.split(',').map(part => part.trim());

        if (parts.length !== 2) {
            botResponse = "Неверный формат команды. Используйте: записаться [дата] [время], [мастер,услуга]";
        } else {

            const [dateTimeStr, masterAndServiceName] = parts;
             const [masterName, serviceName] = masterAndServiceName.split(',').map(part => part.trim());


            // Разделяем дату и время
            const dateTimeParts = dateTimeStr.split(' ');
            if (dateTimeParts.length < 2) {
                botResponse = "Пожалуйста, укажите дату и время в формате: ГГГГ-ММ-ДД ЧЧ:ММ";
            } else {
                const [date, time] = dateTimeParts;

                // Теперь ищем мастера и услугу
                try {
                    const master = await dbQueries.getMasterByName(masterName);
                    const service = await dbQueries.getServiceByName(serviceName);

                    if (!master || !service) {
                        botResponse = "Не удалось найти мастера или услугу.";
                    } else {
                        // Используем loggedInUserId
                        try {
                            const appointment = await dbQueries.createAppointment(loggedInUserId, service.service_id, master.master_id, date, time);
                            if (appointment) {
                                botResponse = `Вы записаны к мастеру ${master.name} на ${date} в ${time}.`;
                            } else {
                                botResponse = "Не удалось создать запись.";
                            }
                        } catch (error) {
                            console.error("Ошибка при создании записи:", error);
                            botResponse = "Произошла ошибка при записи. Попробуйте позже.";
                        }
                    }
                } catch (error) {
                    console.error("Ошибка при поиске мастера или услуги:", error);
                    botResponse = "Произошла ошибка при поиске мастера или услуги. Попробуйте позже.";
                }
            }
        }
    }

    if (lowerCaseText.startsWith('зарегистрироваться')) {
        const commandBody = text.slice('зарегистрироваться'.length).trim();
        const parts = commandBody.split(',');

        if (parts.length !== 2) {
            botResponse = "Неверный формат команды зарегистрироваться. Используйте: зарегистрироваться [имя пользователя], [email,пароль,телефон]";
        } else {

            const username = parts[0].trim();
            const remainingPart = parts[1].trim();
            const [email, password, phone] = remainingPart.split(',').map(part => part.trim()); // Разделяем email, password и phone

            if (!email || !password || !phone) {
                botResponse = "Неверный формат команды зарегистрироваться. [email,пароль,телефон] должны быть разделены запятыми.";
            } else {
                try {
                    // Вызываем функцию createUser из db.queries
                    const newUser = await dbQueries.createUser(username, email, password, phone);
                    console.log("New user created:", newUser);
                    botResponse = "Регистрация успешна!";
                } catch (error) {
                    console.error("Error registering user:", error);
                    if (error.constraint === 'users_email_key') {
                        botResponse = "Пользователь с таким email уже существует.";
                    } else {
                        botResponse = "Произошла ошибка при регистрации.";
                    }
                }
            }
        }
    }

    if (lowerCaseText.startsWith('войти')) {
        console.log("Processing 'войти' command");
        const parts = text.split(' ');
        if (parts.length < 3) {
            botResponse = "Неверный формат команды войти. Используйте: войти [email] [пароль]";
        } else {
            const [_, email, password] = parts;

            try {
                const user = await dbQueries.getUserByEmail(email);
                if (!user) {
                    botResponse = "Пользователь с таким email не найден.";
                } else {
                    // Прямое сравнение паролей (ОПАСНО!)
                    if (password === user.password) {
                        console.log("Login successful:", user);
                        loggedInUserId = user.user_id; //  Сохраняем ID вошедшего пользователя
                        botResponse = "Вход выполнен!"; // Сообщение об успешном входе
                    } else {
                        botResponse = "Неверный пароль.";
                    }
                }

            } catch (error) {
                console.error("Error logging in:", error);
                botResponse = "Произошла ошибка при входе.";
            }
        }
    }

    if (!botResponse) {
        botResponse = `Вы сказали: ${text}`; // Ответ по умолчанию
    }

    return botResponse;
}

app.post('/api/message', async (req, res) => {
    const { text, userId } = req.body; // Передайте userId в теле, если есть
    // Или, если userId не передается, используйте глобальную переменную — что не очень безопасно
    if (!userId) {
        return res.status(401).json({ message: 'Требуется войти в систему, чтобы отправлять сообщения.' });
    }
    console.log('Получено сообщение:', text, 'от пользователя:', userId);
    try {
        const botResponse = await handleUserMessage(text, userId);
        await saveBotMessage(userId, botResponse);
        res.json({ response: botResponse });
    } catch (error) {
        console.error("Ошибка при обработке сообщения:", error);
        res.status(500).json({ message: "Произошла ошибка при обработке сообщения." });
    }
});

//  Эндпоинт для проверки подключения к базе данных
app.get('/test-db', async (req, res) => {
    try {
        const result = await dbQueries.query('SELECT NOW()');
        res.json({ message: 'Подключение к БД успешно!', timestamp: result.rows[0].now });
    } catch (error) {
        console.error("Ошибка подключения к БД:", error);
        res.status(500).json({ message: 'Ошибка подключения к БД', error: error.message });
    }
});

//  Добавим отправку приветственного сообщения при загрузке страницы
app.get('/init', async (req, res) => {
    const welcomeMessage = `
        👋 Приветствую! Я Чат-бот "Студии Суворова".<br>
        Я могу помочь тебе с:<br>
        - Регистрацией: зарегистрироваться [имя пользователя], [email,пароль,телефон]<br>
        - Входом в систему: войти [email] [пароль]<br>
        - Просмотром списка мастеров: мастера<br>
        - Просмотром списка услуг: услуги<br>
        - Записью на прием: записаться [дата] [время], [мастер,услуга]<br>
        
        Чтобы начать, просто введи нужную команду!`;
    try {
        res.json({ response: welcomeMessage });
    } catch (error) {
        console.error("Error sending welcome message:", error);
        res.status(500).json({ error: "Произошла ошибка при отправке приветственного сообщения." });
    }
});

// Ендпоинт для регистрации пользователя
app.post('/register', async (req, res) => {
    const { username } = req.body;
    const remainingPart = req.body.remainingPart;
    const [email, password, phone] = remainingPart.split(',').map(part => part.trim()); // Разделяем email, password и phone
    try {
        const newUser = await dbQueries.createUser(username, email, password, phone);
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
            // Прямое сравнение паролей
            if (password === user.password) {
                // Вход выполнен!
                loggedInUserId = user.user_id;
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
app.post('/appointments', requireLogin, async (req, res) => { //  Только после входа
    const { serviceId, masterId, appointmentDate, appointmentTime } = req.body;
    try {
        const newAppointment = await dbQueries.createAppointment(loggedInUserId, serviceId, masterId, appointmentDate, appointmentTime);
        res.status(201).json({ message: 'Запись успешно создана', appointment: newAppointment });
    } catch (error) {
        console.error("Ошибка при создании записи:", error);
        res.status(500).json({ message: 'Ошибка при создании записи', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

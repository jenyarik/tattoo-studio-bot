require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db.queries.js');
const cors = require('cors');
const jwt = require('jsonwebtoken'); //  Подключаем jsonwebtoken
const { getMasters, getServices, createAppointment, getMasterByName, getServiceByName, saveBotMessage } = require('./db.queries.js');

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

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    // Проверяем наличие JWT-токена в заголовке Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Требуется авторизация. Отсутствует заголовок Authorization.' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: 'Требуется авторизация. Отсутствует JWT токен' });
    }

    try {
        // Верифицируем JWT-токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Добавляем информацию о пользователе в объект запроса
        req.user = decoded;  //  В req.user теперь информация о пользователе (например, user_id)

        // Передаем управление следующему middleware или обработчику маршрута
        next();
    } catch (error) {
        console.error("Ошибка верификации JWT:", error);
        return res.status(401).json({ message: 'Неверный JWT-токен' });
    }
}

// Обработка сообщений от пользователя
async function handleUserMessage(text, user) { //  Принимаем user, убираем userId
    console.log(`handleUserMessage called with text: "${text}"`);
    console.log(`Обработка сообщения "${text}" от пользователя ${user.user_id}`); // используем user.user_id

    const lowerCaseText = text.toLowerCase().trim(); // Добавляем trim() для удаления пробелов
    const welcomeMessage = `
        👋 Приветствую! Я Чат-бот "Студии Суворова".<br>
        Я могу помочь тебе с:<br>
        - Регистрацией:  зарегистрироваться [имя пользователя], [email] [пароль] [телефон]<br>
        - Входом в систему: войти [email] [пароль]<br>
        - Просмотром списка мастеров: мастера<br>
        - Просмотром списка услуг: услуги<br>
        - Записью на прием: записаться [дата] [время], [мастер], [услуга]<br>
        
        Чтобы начать, просто введи нужную команду!`;

    let botResponse = null; //  Переменная для хранения ответа бота

    if (lowerCaseText === 'мастера') {
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
    }

    if (lowerCaseText === 'услуги') {
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
    }

   if (lowerCaseText.startsWith('записаться')) {
        const commandBody = lowerCaseText.slice('записаться'.length).trim();
        // Разделяем по запятым
        const parts = commandBody.split(',').map(part => part.trim());

        if (parts.length < 3) {
            botResponse = "Неверный формат команды. Используйте: записаться [дата] [время], [имя мастера], [услуга]";
        } else {

          const [dateTimeStr, masterName, serviceName] = parts;

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
                      // Используем user.user_id из JWT
                      const appointment = await dbQueries.createAppointment(user.user_id, service.service_id, master.master_id, date, time);
                      if (appointment) {
                          botResponse = `Вы записаны к мастеру ${master.name} на ${date} в ${time}.`;
                      } else {
                          botResponse = "Не удалось создать запись.";
                      }
                  }
              } catch (error) {
                  console.error("Ошибка при обработке записи:", error);
                  botResponse = "Произошла ошибка при записи. Попробуйте позже.";
              }
          }
        }

    }

    if (lowerCaseText.startsWith('зарегистрироваться')) {
       const commandBody = text.slice('зарегистрироваться'.length).trim();
       const parts = commandBody.split(',');

       if (parts.length !== 2) {
         botResponse = "Неверный формат команды зарегистрироваться. Используйте: зарегистрироваться [имя пользователя], [email пароль телефон]";
       } else {

         const username = parts[0].trim();
         const remainingPart = parts[1].trim();
         const [email, password, phone] = remainingPart.split(' ');

         if (!email || !password || !phone) {
           botResponse = "Неверный формат команды зарегистрироваться.  [email] [пароль] [телефон] должны быть разделены пробелами.";
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

    return botResponse; // Возвращаем ответ бота
}

app.post('/api/message', requireAuth, async (req, res) => { // применяем middleware requireAuth
    const { text } = req.body; //  Больше не нужен userId, используем req.user
    //  req.user содержит информацию о пользователе из JWT
    console.log('Получено сообщение:', text, 'от пользователя:', req.user);

    //  Вызываем функцию обработки сообщения бота, передавая информацию о пользователе
    const botResponse = await handleUserMessage(text, req.user); // передаем req.user
    //  Сохраняем сообщение бота
    try {
        await saveBotMessage(req.user.user_id, botResponse);  
        console.log("Bot message saved");
    } catch (error) {
        console.error("Error saving bot message:", error);
    }
    res.setHeader('Content-Type', 'application/json'); 
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
        👋 Приветствую! Я Чат-бот "Студии Суворова".<br>
        Я могу помочь тебе с:<br>
        - Регистрацией:  зарегистрироваться [имя пользователя], [email] [пароль] [телефон]<br>
        - Входом в систему: войти [email] [пароль]<br>
        - Просмотром списка мастеров: мастера<br>
        - Просмотром списка услуг: услуги<br>
        - Записью на прием: записаться [дата] [время], [мастер], [услуга]<br>
        
        Чтобы начать, просто введи нужную команду!`;
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
        const newUser = await dbQueries.createUser(username, email, password, phone); // Передаем пароль в открытом виде
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
                //  Создаем JWT токен
                const token = jwt.sign({ user_id: user.user_id, username: user.username, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

                res.json({ message: 'Вход выполнен!', token: token, user: { user_id: user.user_id, username: user.username, email: user.email } });
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
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

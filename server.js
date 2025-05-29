// server.js
const express = require('express');
const bodyParser = require('body-parser');
const dbQueries = require('./db/db.queries'); // Импортируем модуль для работы с БД

const app = express();
const port = process.env.PORT || 3000; // Используем переменную окружения для порта

// Middleware
app.use(bodyParser.json()); // Для обработки JSON-тел запросов
app.use(bodyParser.urlencoded({ extended: true })); // Для обработки urlencoded-тел запросов

//  Пример обработчика (замени на свои эндпойнты)
app.post('/register', async (req, res) => {
    const { telegramId, username, firstName, lastName, email } = req.body;
    try {
        const newUser = await dbQueries.createUser(telegramId, username, firstName, lastName, email);
        res.status(201).json({ message: 'Пользователь успешно создан', user: newUser });
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        res.status(500).json({ message: 'Ошибка при создании пользователя' });
    }
});

//  Пример получения сообщений (замени на свои эндпойнты)
app.get('/messages', async (req, res) => {
  try {
      const messages = await dbQueries.getBotMessages();
      res.json(messages);
  } catch (error) {
      console.error("Ошибка при получении сообщений:", error);
      res.status(500).json({ message: 'Ошибка при получении сообщений' });
  }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const db = require('./db.config');

async function createUser(telegramId, username, firstName, lastName) {
    const queryText = 'INSERT INTO users (telegram_id, username, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [telegramId, username, firstName, lastName];
    try {
      const result = await db.query(queryText, values);
      return result[0];
    } catch (error) {
      console.error("Ошибка при создании пользователя:", error);
      throw error;
    }
}

async function findUserByTelegramId(telegramId) {
    const queryText = 'SELECT * FROM users WHERE telegram_id = $1';
    const values = [telegramId];
    try {
      const result = await db.query(queryText, values);
      return result[0];
    } catch (error) {
      console.error("Ошибка при поиске пользователя:", error);
      throw error;
    }
}

async function saveUserData(userId, key, value) {
    const queryText = 'INSERT INTO user_data (user_id, data_key, data_value) VALUES ($1, $2, $3)';
    const values = [userId, key, value];
    try {
      await db.query(queryText, values);
    } catch (error) {
      console.error("Ошибка при сохранении данных пользователя:", error);
      throw error;
    }
}

async function getBotAnswer(question) {
    const queryText = 'SELECT answer FROM bot_questions WHERE question = $1';
    const values = [question];
    try {
        const result = await db.query(queryText, values);
        return result[0] ? result[0].answer : null; // Возвращаем ответ или null, если вопрос не найден
    } catch (error) {
        console.error("Ошибка при поиске ответа бота:", error);
        throw error;
    }
}

module.exports = {
    createUser,
    findUserByTelegramId,
    saveUserData,
    getBotAnswer
};

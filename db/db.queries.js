const db = require('./db.config');

async function createUser(telegramId, username, firstName, lastName, email) {
    const queryText = 'INSERT INTO users (telegram_id, username, first_name, last_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [telegramId, username, firstName, lastName, email];
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
async function saveBotMessage(userId, chatId, messageText) {
    const queryText = 'INSERT INTO bot_messages (user_id, chat_id, message_text) VALUES ($1, $2, $3)';
    const values = [userId, chatId, messageText];
    try {
        await db.query(queryText, values);
        console.log('Сообщение бота сохранено в базе данных');
    } catch (error) {
        console.error("Ошибка при сохранении сообщения бота:", error);
        throw error;
    }
}

async function getBotMessages() {
    const queryText = 'SELECT * FROM bot_messages ORDER BY message_date DESC';
    try {
        const result = await db.query(queryText);
        return result;
    } catch (error) {
        console.error("Ошибка при получении сообщений бота:", error);
        throw error;
    }
}

module.exports = {
    createUser,
    findUserByTelegramId,
    saveUserData,
    getBotAnswer,
    saveBotMessage,
    getBotMessages
};

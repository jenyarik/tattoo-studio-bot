// db.queries.js
const db = require('./db');

//  Функция создания пользователя
async function createUser(username, email, passwordHash, phone) {
    const queryText = 'INSERT INTO users (username, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [username, email, passwordHash, phone];
    try {
        const result = await db.query(queryText, values);
        return result.rows[0];
    } catch (error) {
        console.error("Ошибка при создании пользователя:", error);
        throw error;
    }
}

// Функция получения списка услуг
async function getServices() {
    const queryText = 'SELECT * FROM services';
    try {
        const result = await db.query(queryText);
        return result.rows;
    } catch (error) {
        console.error("Ошибка при получении списка услуг:", error);
        throw error;
    }
}

// Функция получения списка мастеров
async function getMasters() {
    const queryText = 'SELECT * FROM masters';
    try {
        const result = await db.query(queryText);
        return result.rows;
    } catch (error) {
        console.error("Ошибка при получении списка мастеров:", error);
        throw error;
    }
}

//  Функция создания записи на прием
async function createAppointment(userId, serviceId, masterId, appointmentDate, appointmentTime) {
    const queryText = 'INSERT INTO appointments (user_id, service_id, master_id, appointment_date, appointment_time) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [userId, serviceId, masterId, appointmentDate, appointmentTime];
    try {
        const result = await db.query(queryText, values);
        return result.rows[0];
    } catch (error) {
        console.error("Ошибка при создании записи:", error);
        throw error;
    }
}

//  Удаление таблицы bot_messages, если не используется
//  const queryText = 'SELECT * FROM bot_messages';
//  try {
//      const result = await db.query(queryText);
//      return result.rows;
//  } catch (error) {
//      console.error("Ошибка при получении списка мастеров:", error);
//      throw error;
//  }

module.exports = {
    createUser,
    getServices,
    getMasters,
    createAppointment,
    // Другие функции
};

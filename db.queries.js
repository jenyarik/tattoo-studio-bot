// db.queries.js
const { Pool } = require('pg');
require('dotenv').config(); //  Подключаем переменные окружения

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false //  ВНИМАНИЕ: В production-среде настроить SSL правильно!
    }
});

async function query(text, params) {
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (err) {
        console.error('Ошибка при выполнении запроса', err);
        throw err;
    }
}

async function createUser(username, email, passwordHash, phone) {
    const queryText = `
        INSERT INTO users (username, email, password_hash, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, email, phone, registration_date
    `;
    const values = [username, email, passwordHash, phone];
    try {
        const result = await query(queryText, values);
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при создании пользователя', err);
        throw err;
    }
}

async function getUserByEmail(email) {
    const queryText = `
        SELECT user_id, username, email, password_hash, phone
        FROM users
        WHERE email = $1
    `;
    const values = [email];
    try {
        const result = await query(queryText, values);
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при получении пользователя по email', err);
        throw err;
    }
}

async function getServices() {
    const queryText = `SELECT service_id, name, description, price FROM services`;
    try {
        const result = await query(queryText);
        return result.rows;
    } catch (err) {
        console.error('Ошибка при получении списка услуг', err);
        throw err;
    }
}

async function getMasters() {
    const queryText = `SELECT master_id, name, specialization FROM masters`;
    try {
        const result = await query(queryText);
        return result.rows;
    } catch (err) {
        console.error('Ошибка при получении списка мастеров', err);
        throw err;
    }
}

async function createAppointment(userId, serviceId, masterId, appointmentDate, appointmentTime) {
    const queryText = `
        INSERT INTO appointments (user_id, service_id, master_id, appointment_date, appointment_time)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING appointment_id, user_id, service_id, master_id, appointment_date, appointment_time
    `;
    const values = [userId, serviceId, masterId, appointmentDate, appointmentTime];
    try {
        const result = await query(queryText, values);
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при создании записи на прием', err);
        throw err;
    }
}

module.exports = {
    query,
    createUser,
    getUserByEmail,
    getServices,
    getMasters,
    createAppointment,
};

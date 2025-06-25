const { Pool } = require('pg');
require('dotenv').config(); // Подключаем .env

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: true, // Или можно убрать эту строку - по умолчанию true
    },
});

module.exports = {
  query: async (text, params) => {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
};

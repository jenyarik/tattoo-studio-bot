// db.js
const { Pool } = require('pg');
const dbConfig = require('./db.config');

const pool = new Pool(dbConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
};

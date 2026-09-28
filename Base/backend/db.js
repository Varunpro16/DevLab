// db.js
const mysql = require('mysql2/promise');


const pool = mysql.createPool({
  host: 'localhost',
  user: 'javauser',
  password: 'javapass',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  database: 'IDE_Project',
  port: 3306
});
module.exports = pool;

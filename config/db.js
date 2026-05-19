const mysql = require("mysql2");
require("dotenv").config();

let pool;

if (process.env.DATABASE_URL) {
    // Usar URL completa si existe
    pool = mysql.createPool(process.env.DATABASE_URL);
} else {
    // Usar variables individuales
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });
}

module.exports = pool.promise();

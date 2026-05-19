const mysql = require("mysql2");
require("dotenv").config();

console.log("=== CONFIGURACIÓN BD ===");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
});

pool.promise().query("SELECT 1")
    .then(() => console.log("✅ Conexión a BD exitosa"))
    .catch(err => console.error("❌ Error conexión BD:", err.message));

module.exports = pool.promise();

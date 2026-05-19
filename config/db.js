const mysql = require("mysql2");
require("dotenv").config();

console.log("=== CONFIGURACIÓN BD ===");
console.log("DATABASE_URL existe:", !!process.env.DATABASE_URL);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

let pool;

if (process.env.DATABASE_URL) {
    console.log("Usando DATABASE_URL para conectar");
    pool = mysql.createPool(process.env.DATABASE_URL);
} else {
    console.log("Usando variables individuales para conectar");
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });
}

// Test de conexión al iniciar
pool.promise().query("SELECT 1")
    .then(() => console.log("✅ Conexión a BD exitosa"))
    .catch(err => console.error("❌ Error conexión BD:", err.message));

module.exports = pool.promise();

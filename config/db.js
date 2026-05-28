const mysql = require("mysql2");
const net = require("net");
require("dotenv").config();

console.log("=== CONFIGURACIÓN BD ===");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// TEST TCP
const socket = net.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306
}, () => {
    console.log("✅ TCP conectado correctamente a", process.env.DB_HOST, process.env.DB_PORT);
    socket.destroy();
});
socket.on("error", (err) => {
    console.error("❌ TCP fallido:", err.message);
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 30000,
    idleTimeout: 60000,
    ssl: { rejectUnauthorized: false }
});

pool.promise().query("SELECT 1")
    .then(() => console.log("✅ Conexión a BD exitosa"))
    .catch(err => console.error("❌ Error conexión BD:", err.message));

module.exports = pool.promise();

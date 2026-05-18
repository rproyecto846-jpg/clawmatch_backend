const express = require("express");
const cors = require("cors");
const db = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const torneoRoutes = require("./routes/torneoRoutes");
const inscripcionRoutes = require("./routes/inscripcionRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificacionRoutes = require("./routes/notificacionRoutes");
const comunidadRoutes = require("./routes/comunidadRoutes");
const app = express();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const chatRoutes = require("./routes/chatRoutes");
const suscripcionRoutes = require("./routes/suscripcionRoutes");
const pagoRoutes = require("./routes/pagoRoutes");
const tiendaRoutes = require("./routes/tiendaRoutes");

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => {
    res.json({ message: "Backend ClawMatch funcionando ✅" });
});
app.use(cors());
app.use(express.json());
app.use("/api/suscripciones", suscripcionRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/torneos", torneoRoutes);
app.use("/api/torneos", inscripcionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/torneos", rankingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/comunidades", comunidadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/tienda", tiendaRoutes);

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Ruta de diagnóstico
app.get("/api/test-db", async (req, res) => {
    try {
        console.log("=== TEST DB ===");
        console.log("DB_HOST:", process.env.DB_HOST);
        console.log("DB_USER:", process.env.DB_USER);
        console.log("DB_NAME:", process.env.DB_NAME);
        console.log("DB_PORT:", process.env.DB_PORT);
        
        const db = require("./config/db");
        const [rows] = await db.query("SELECT 1 AS test");
        
        res.json({ 
            success: true, 
            message: "Conexión exitosa",
            result: rows[0]
        });
    } catch (error) {
        console.error("ERROR CONEXIÓN DB:", error.message);
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

app.get("/api/juegos", async (req, res) => {
    try {
        const db = require("./config/db");
        console.log("Intentando conectar a la base de datos...");
        const [rows] = await db.query("SELECT * FROM juegos");
        console.log("Consulta exitosa, filas:", rows.length);
        res.json(rows);
    } catch (error) {
        console.error("ERROR EN /api/juegos:", error); // Añade esto
        res.status(500).json({ 
            error: "Error obteniendo juegos",
            details: error.message // Añade esto para ver el error real
        });
    }
});

app.post("/api/juegos", async (req, res) => {
    try {
        const db = require("./config/db");
        const { nombre, plataforma, genero } = req.body;
        const [result] = await db.query(
            "INSERT INTO juegos (nombre, plataforma, genero) VALUES (?, ?, ?)",
            [nombre, plataforma || null, genero || null]
        );
        res.status(201).json({ id_juego: result.insertId, message: "Juego creado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error creando juego" });
    }
});
module.exports = app;

app.post("/api/upload", upload.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.get("/api/usuarios/:id_usuario", async (req, res) => {
    try {
        const db = require("./config/db");
        const [rows] = await db.query(
            `SELECT u.id_usuario, u.nombre_usuario, u.nickname, u.foto_perfil, u.rol, 
                    u.fecha_registro, u.remarco, u.banner_url, u.banner_tipo, u.color_perfil,
                    t.nombre AS nivel
             FROM usuarios u
             LEFT JOIN tipos_suscripcion t ON u.id_suscripcion_activa = t.id_tipo
             WHERE u.id_usuario = ?`,
            [req.params.id_usuario]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo usuario" });
    }
});

app.get("/api/usuarios/:id_usuario/torneos", async (req, res) => {
    try {
        const db = require("./config/db");
        const [rows] = await db.query(
            `SELECT t.id_torneo, t.nombre, t.fecha_inicio, t.fecha_fin, t.estado
             FROM inscripciones_torneo i
             JOIN torneos t ON i.id_torneo = t.id_torneo
             WHERE i.id_usuario = ? AND i.estado = 'activo'`,
            [req.params.id_usuario]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo torneos" });
    }
});

app.get("/api/usuarios/:id_usuario/comunidades", async (req, res) => {
    try {
        const db = require("./config/db");
        const [rows] = await db.query(
            `SELECT COUNT(*) AS total FROM miembros_comunidad WHERE id_usuario = ?`,
            [req.params.id_usuario]
        );
        res.json({ total: rows[0].total });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo comunidades" });
    }
});

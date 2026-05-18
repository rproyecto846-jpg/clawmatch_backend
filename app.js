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
const chatRoutes = require("./routes/chatRoutes");
const suscripcionRoutes = require("./routes/suscripcionRoutes");
const pagoRoutes = require("./routes/pagoRoutes");
const tiendaRoutes = require("./routes/tiendaRoutes");
const multer = require("multer");
const path = require("path");
 
const app = express();
 
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
 
app.use(cors());
app.use(express.json());
 
// Archivos estáticos con URLs limpias (sin .html)
app.use(express.static(__dirname + "/public", { extensions: ["html"] }));
 
// Redirección raíz → login limpio
app.get("/", (req, res) => {
    res.redirect("/login");
});
 
// Rutas API
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
 
// Upload de imágenes
app.post("/api/upload", upload.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
    res.json({ url: `/uploads/${req.file.filename}` });
});
 
// Juegos
app.get("/api/juegos", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM juegos");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo juegos", details: error.message });
    }
});
 
app.post("/api/juegos", async (req, res) => {
    try {
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
 
// Usuarios
app.get("/api/usuarios/:id_usuario", async (req, res) => {
    try {
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
        const [rows] = await db.query(
            `SELECT COUNT(*) AS total FROM miembros_comunidad WHERE id_usuario = ?`,
            [req.params.id_usuario]
        );
        res.json({ total: rows[0].total });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo comunidades" });
    }
});
 
// Test de conexión a BD (útil para diagnóstico)
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS test");
        res.json({ success: true, message: "Conexión exitosa", result: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, code: error.code });
    }
});
 
module.exports = app;
 

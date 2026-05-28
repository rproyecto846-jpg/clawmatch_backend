const app = require("./app.js");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Middleware auth para socket
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No autorizado"));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("Token inválido"));
    }
});

const db = require("./config/db");

io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.user.nombre_usuario}`);

    // Unirse a sala
    socket.on("unirse_sala", (sala_id) => {
        socket.join(`sala_${sala_id}`);
    });

    // Unirse a comunidad (chat global)
    socket.on("unirse_comunidad", (id_comunidad) => {
        socket.join(`comunidad_${id_comunidad}`);
    });

    // Mensaje en sala de comunidad (chat global)
    
socket.on("mensaje_comunidad", async ({ id_comunidad, contenido }) => {
    if (!contenido) return;
    try {
        const [result] = await db.query(
            "INSERT INTO mensajes_chat_global (id_comunidad, id_usuario, contenido) VALUES (?, ?, ?)",
            [id_comunidad, socket.user.id, contenido]
        );
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_chat_global m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_mensaje = ?`, [result.insertId]
        );
        io.to(`comunidad_${id_comunidad}`).emit("nuevo_mensaje_comunidad", rows[0]);
    } catch (err) {
        console.error(err);
    }
});

    // Mensaje en chat privado o grupo
    
socket.on("mensaje_chat", async ({ id_chat, contenido }) => {
    if (!contenido) return;
    try {
        const [participa] = await db.query(
            "SELECT * FROM participantes_chat_privado WHERE id_chat = ? AND id_usuario = ?",
            [id_chat, socket.user.id]
        );
        if (participa.length === 0) return;

        const [result] = await db.query(
            "INSERT INTO mensajes_privados (id_chat, id_usuario, contenido) VALUES (?, ?, ?)",
            [id_chat, socket.user.id, contenido]
        );
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_privados m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_mensaje = ?`, [result.insertId]
        );
        io.to(`sala_${id_chat}`).emit("nuevo_mensaje_chat", rows[0]);
    } catch (err) {
        console.error(err);
    }
});

   // Mensaje en sala pública
    socket.on("mensaje_sala_publica", async ({ id_sala, contenido }) => {
    if (!contenido) return;
    try {
        const [result] = await db.query(
            "INSERT INTO mensajes_sala (id_sala, id_usuario, contenido) VALUES (?, ?, ?)",
            [id_sala, socket.user.id, contenido]
        );
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_sala m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_mensaje = ?`, [result.insertId]
        );
        io.to(`sala_${id_sala}`).emit("nuevo_mensaje_sala", rows[0]);
    } catch (err) {
        console.error(err);
    }
});
// Escribiendo en chat privado
socket.on("escribiendo", ({ id_chat }) => {
    socket.to(`sala_${id_chat}`).emit("usuario_escribiendo", {
        id_chat,
        nombre: socket.user.nombre_usuario
    });
});

socket.on("dejo_escribir", ({ id_chat }) => {
    socket.to(`sala_${id_chat}`).emit("usuario_dejo_escribir", { id_chat });
});

// Escribiendo en chat global comunidad
socket.on("escribiendo_comunidad", ({ id_comunidad }) => {
    socket.to(`comunidad_${id_comunidad}`).emit("usuario_escribiendo_comunidad", {
        nombre: socket.user.nombre_usuario
    });
});

socket.on("dejo_escribir_comunidad", ({ id_comunidad }) => {
    socket.to(`comunidad_${id_comunidad}`).emit("usuario_dejo_escribir_comunidad");
});

    socket.on("disconnect", () => {
        console.log(`Usuario desconectado: ${socket.user.nombre_usuario}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = { io };

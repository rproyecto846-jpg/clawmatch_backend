const db = require("../config/db");

exports.crearChat = async (req, res) => {
    try {
        const { nombre, participantes, es_grupal } = req.body;
        const [result] = await db.query(
            "INSERT INTO chats_privados (nombre, creador, es_grupal) VALUES (?, ?, ?)",
            [nombre || null, req.user.id, es_grupal || false]
        );
        const id_chat = result.insertId;
        await db.query(
            "INSERT INTO participantes_chat_privado (id_chat, id_usuario, rol) VALUES (?, ?, 'creador')",
            [id_chat, req.user.id]
        );
        for (const id_usuario of participantes) {
            if (id_usuario !== req.user.id) {
                await db.query(
                    "INSERT INTO participantes_chat_privado (id_chat, id_usuario) VALUES (?, ?)",
                    [id_chat, id_usuario]
                );
            }
        }
        res.status(201).json({ message: "Chat creado", id_chat });
    } catch (error) {
        res.status(500).json({ error: "Error creando chat", details: error.message });
    }
};

exports.misChats = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*,
                    COUNT(DISTINCT p.id_usuario) AS total_participantes,
                    (SELECT m.contenido FROM mensajes_privados m WHERE m.id_chat = c.id_chat ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
                    (SELECT m.fecha_envio FROM mensajes_privados m WHERE m.id_chat = c.id_chat ORDER BY m.fecha_envio DESC LIMIT 1) AS fecha_ultimo
             FROM chats_privados c
             JOIN participantes_chat_privado p ON c.id_chat = p.id_chat
             WHERE p.id_usuario = ?
             GROUP BY c.id_chat
             ORDER BY fecha_ultimo DESC`,
            [req.user.id]
        );
        for (const chat of rows) {
            const [parts] = await db.query(
                `SELECT u.id_usuario, u.nombre_usuario, u.foto_perfil, u.nickname FROM participantes_chat_privado p
                 JOIN usuarios u ON p.id_usuario = u.id_usuario
                 WHERE p.id_chat = ?`, [chat.id_chat]
            );
            chat.participantes = parts;
        }
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo chats", details: error.message });
    }
};

exports.mensajesChat = async (req, res) => {
    try {
        const { id_chat } = req.params;
        const [participa] = await db.query(
            "SELECT * FROM participantes_chat_privado WHERE id_chat = ? AND id_usuario = ?",
            [id_chat, req.user.id]
        );
        if (participa.length === 0) return res.status(403).json({ error: "No tienes acceso a este chat" });
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_privados m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_chat = ?
             ORDER BY m.fecha_envio ASC
             LIMIT 100`,
            [id_chat]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo mensajes", details: error.message });
    }
};

exports.buscarUsuarios = async (req, res) => {
    try {
        const { q } = req.query;
        const [rows] = await db.query(
            "SELECT id_usuario, nombre_usuario, nickname, foto_perfil FROM usuarios WHERE nombre_usuario LIKE ? AND id_usuario != ? LIMIT 10",
            [`%${q}%`, req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error buscando usuarios", details: error.message });
    }
};

exports.agregarParticipante = async (req, res) => {
    try {
        const { id_chat } = req.params;
        const { id_usuario } = req.body;
        await db.query(
            "INSERT IGNORE INTO participantes_chat_privado (id_chat, id_usuario) VALUES (?, ?)",
            [id_chat, id_usuario]
        );
        res.json({ message: "Participante añadido" });
    } catch (error) {
        res.status(500).json({ error: "Error añadiendo participante", details: error.message });
    }
};

exports.crearSalaPublica = async (req, res) => {
    try {
        const { nombre, descripcion, id_comunidad } = req.body;
        if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });
        const [result] = await db.query(
            "INSERT INTO salas_chat (nombre, descripcion, id_comunidad, creador) VALUES (?, ?, ?, ?)",
            [nombre, descripcion || null, id_comunidad || 1, req.user.id]
        );
        res.status(201).json({ message: "Sala creada", id_sala: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error creando sala", details: error.message });
    }
};

exports.listarSalasPublicas = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT s.*, u.nombre_usuario AS creador_nombre,
                    COUNT(DISTINCT m.id_mensaje) AS total_mensajes
             FROM salas_chat s
             JOIN usuarios u ON s.creador = u.id_usuario
             LEFT JOIN mensajes_sala m ON s.id_sala = m.id_sala
             WHERE s.estado = 'activa'
             GROUP BY s.id_sala
             ORDER BY total_mensajes DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando salas", details: error.message });
    }
};

exports.mensajesSala = async (req, res) => {
    try {
        const { id_sala } = req.params;
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_sala m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_sala = ?
             ORDER BY m.fecha_envio ASC
             LIMIT 100`,
            [id_sala]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo mensajes", details: error.message });
    }
};

exports.mensajesComunidad = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const [rows] = await db.query(
            `SELECT m.*, u.nombre_usuario, u.foto_perfil, u.nickname FROM mensajes_chat_global m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_comunidad = ?
             ORDER BY m.fecha_envio ASC
             LIMIT 50`,
            [id_comunidad]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo mensajes", details: error.message });
    }
};

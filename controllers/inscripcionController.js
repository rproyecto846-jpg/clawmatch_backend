const db = require("../config/db");
const { enviarEmail } = require("../services/emailService");
const { crearNotificacion } = require("../services/notificacionService");

exports.inscribirse = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const id_usuario = req.user.id;

        // Verificar que el torneo existe y está abierto
        const [torneo] = await db.query(
            "SELECT * FROM torneos WHERE id_torneo = ? AND estado = 'abierto'",
            [id_torneo]
        );
        if (torneo.length === 0) {
            return res.status(404).json({ error: "Torneo no encontrado o no está abierto" });
        }

        // Verificar que no está ya inscrito
        const [existe] = await db.query(
            "SELECT * FROM inscripciones_torneo WHERE id_torneo = ? AND id_usuario = ?",
            [id_torneo, id_usuario]
        );
        if (existe.length > 0) {
            return res.status(400).json({ error: "Ya estás inscrito en este torneo" });
        }

        await db.query(
            "INSERT INTO inscripciones_torneo (id_torneo, id_usuario) VALUES (?, ?)",
            [id_torneo, id_usuario]
        );
// Obtener datos del usuario y torneo para notificar
const [usuario] = await db.query("SELECT * FROM usuarios WHERE id_usuario = ?", [id_usuario]);
const [torneoData] = await db.query("SELECT * FROM torneos WHERE id_torneo = ?", [id_torneo]);

// Notificación interna
await crearNotificacion(
    id_usuario,
    "inscripcion",
    `Te has inscrito al torneo "${torneoData[0].nombre}"`
);

// Email
await enviarEmail(
    usuario[0].email,
    `Inscripción confirmada - ${torneoData[0].nombre}`,
    `<h2>¡Inscripción confirmada!</h2>
     <p>Hola <b>${usuario[0].nombre_usuario}</b>,</p>
     <p>Te has inscrito correctamente al torneo <b>${torneoData[0].nombre}</b>.</p>
     <p>Fecha de inicio: ${torneoData[0].fecha_inicio}</p>
     <p>¡Mucha suerte!</p>
     <br><p>— Equipo ClawMatch</p>`
);
        res.status(201).json({ message: "Inscripción realizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error en la inscripción", details: error.message });
    }
};

exports.listarParticipantes = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const [rows] = await db.query(
            `SELECT u.id_usuario, u.nombre_usuario, u.email, i.fecha_inscripcion, i.estado
             FROM inscripciones_torneo i
             JOIN usuarios u ON i.id_usuario = u.id_usuario
             WHERE i.id_torneo = ?`,
            [id_torneo]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando participantes", details: error.message });
    }
};

exports.misInscripciones = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT t.id_torneo, t.nombre, t.fecha_inicio, t.fecha_fin, t.estado, i.fecha_inscripcion
             FROM inscripciones_torneo i
             JOIN torneos t ON i.id_torneo = t.id_torneo
             WHERE i.id_usuario = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo inscripciones", details: error.message });
    }
};

const db = require("../config/db");
const { verificarLimiteTorneos } = require("./suscripcionController");

exports.crearTorneo = async (req, res) => {
    try {
	const limite = await verificarLimiteTorneos(req.user.id);
if (!limite.permitido) {
    return res.status(403).json({ 
        error: `Has alcanzado el límite de ${limite.limite} torneos para el plan ${limite.nivel}. Actualiza tu suscripción para crear más.`
    });
}
        const { nombre, descripcion, fecha_inicio, fecha_fin, max_participantes, id_juego, tipo, premio, precio_inscripcion } = req.body;
        await db.query(
            `INSERT INTO torneos (nombre, descripcion, fecha_inicio, fecha_fin, max_participantes, id_juego, tipo, premio, precio_inscripcion, creado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, fecha_inicio, fecha_fin, max_participantes || 8, id_juego, tipo, premio, precio_inscripcion || 0, req.user.id]
        );
        res.status(201).json({ message: "Torneo creado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error creando torneo", details: error.message });
    }
};

exports.editarTorneo = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const [torneo] = await db.query("SELECT * FROM torneos WHERE id_torneo = ?", [id_torneo]);
        if (torneo.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });

        // Solo el creador o admin puede editar
        if (torneo[0].creado_por !== req.user.id && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso para editar este torneo" });
        }

        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, premio, max_participantes, tipo, precio_inscripcion } = req.body;
        await db.query(
            `UPDATE torneos SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?, premio=?, max_participantes=?, tipo=?, precio_inscripcion=? WHERE id_torneo=?`,
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, premio, max_participantes, tipo, precio_inscripcion, id_torneo]
        );
        res.json({ message: "Torneo actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error editando torneo", details: error.message });
    }
};

exports.listarTorneos = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT t.*, u.nombre_usuario FROM torneos t JOIN usuarios u ON t.creado_por = u.id_usuario"
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando torneos", details: error.message });
    }
};
exports.verTorneo = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT t.*, u.nombre_usuario AS creador, j.nombre AS juego
             FROM torneos t
             JOIN usuarios u ON t.creado_por = u.id_usuario
             LEFT JOIN juegos j ON t.id_juego = j.id_juego
             WHERE t.id_torneo = ?`,
            [req.params.id_torneo]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo torneo", details: error.message });
    }
};
exports.borrarTorneo = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const [torneo] = await db.query("SELECT * FROM torneos WHERE id_torneo = ?", [id_torneo]);
        if (torneo.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });

        if (torneo[0].creado_por !== req.user.id && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso para borrar este torneo" });
        }

        await db.query("DELETE FROM inscripciones_torneo WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM resultados WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM rankings WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM torneos WHERE id_torneo = ?", [id_torneo]);
        res.json({ message: "Torneo eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error borrando torneo", details: error.message });
    }
};

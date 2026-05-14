const db = require("../config/db");

// USUARIOS
exports.listarUsuarios = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id_usuario, nombre_usuario, email, rol, estado, fecha_registro FROM usuarios"
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando usuarios", details: error.message });
    }
};

exports.cambiarEstadoUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { estado } = req.body;
        await db.query("UPDATE usuarios SET estado = ? WHERE id_usuario = ?", [estado, id_usuario]);
        res.json({ message: "Estado actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando usuario", details: error.message });
    }
};

exports.cambiarRolUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { rol } = req.body;
        await db.query("UPDATE usuarios SET rol = ? WHERE id_usuario = ?", [rol, id_usuario]);
        res.json({ message: "Rol actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando rol", details: error.message });
    }
};

// TORNEOS
exports.editarTorneo = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, premio } = req.body;
        await db.query(
            "UPDATE torneos SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?, premio=? WHERE id_torneo=?",
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, premio, id_torneo]
        );
        res.json({ message: "Torneo actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando torneo", details: error.message });
    }
};

exports.borrarTorneo = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        await db.query("DELETE FROM inscripciones_torneo WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM resultados WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM rankings WHERE id_torneo = ?", [id_torneo]);
        await db.query("DELETE FROM torneos WHERE id_torneo = ?", [id_torneo]);
        res.json({ message: "Torneo borrado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error borrando torneo", details: error.message });
    }
};

// EXPULSAR USUARIO DE TORNEO
exports.expulsarParticipante = async (req, res) => {
    try {
        const { id_torneo, id_usuario } = req.params;
        await db.query(
            "UPDATE inscripciones_torneo SET estado = 'expulsado' WHERE id_torneo = ? AND id_usuario = ?",
            [id_torneo, id_usuario]
        );
        res.json({ message: "Usuario expulsado del torneo" });
    } catch (error) {
        res.status(500).json({ error: "Error expulsando usuario", details: error.message });
    }
};
exports.banearUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { ip } = req.body;
        await db.query("UPDATE usuarios SET estado = 'baneado' WHERE id_usuario = ?", [id_usuario]);
        if (ip) {
            await db.query("INSERT INTO logs_acceso (id_usuario, ip, resultado) VALUES (?, ?, 'fallo')", [id_usuario, ip]);
        }
        res.json({ message: "Usuario baneado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error baneando usuario", details: error.message });
    }
};

exports.cambiarRolUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { rol } = req.body;
        await db.query("UPDATE usuarios SET rol = ? WHERE id_usuario = ?", [rol, id_usuario]);
        res.json({ message: "Rol actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando rol", details: error.message });
    }
};

exports.eliminarUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        await db.query("DELETE FROM inscripciones_torneo WHERE id_usuario = ?", [id_usuario]);
        await db.query("DELETE FROM resultados WHERE id_usuario = ?", [id_usuario]);
        await db.query("DELETE FROM notificaciones WHERE id_usuario = ?", [id_usuario]);
        await db.query("DELETE FROM logs_acceso WHERE id_usuario = ?", [id_usuario]);
        await db.query("DELETE FROM usuarios WHERE id_usuario = ?", [id_usuario]);
        res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error eliminando usuario", details: error.message });
    }
};

exports.logsAcceso = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT l.*, u.nombre_usuario FROM logs_acceso l
             JOIN usuarios u ON l.id_usuario = u.id_usuario
             ORDER BY l.fecha_hora DESC LIMIT 100`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo logs", details: error.message });
    }
};

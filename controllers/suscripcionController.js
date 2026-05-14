const db = require("../config/db");

exports.listarPlanes = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM tipos_suscripcion ORDER BY precio ASC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo planes", details: error.message });
    }
};

exports.miSuscripcion = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id_suscripcion_activa, u.suscripcion_expira, t.nombre, t.precio, t.descripcion
             FROM usuarios u
             LEFT JOIN tipos_suscripcion t ON u.id_suscripcion_activa = t.id_tipo
             WHERE u.id_usuario = ?`,
            [req.user.id]
        );
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo suscripción", details: error.message });
    }
};

exports.getNivel = async (id_usuario) => {
    const [rows] = await db.query(
        `SELECT t.nombre FROM usuarios u
         LEFT JOIN tipos_suscripcion t ON u.id_suscripcion_activa = t.id_tipo
         WHERE u.id_usuario = ?`,
        [id_usuario]
    );
    return rows[0]?.nombre || "Normal";
};

exports.activarSuscripcion = async (req, res) => {
    try {
        const { id_tipo } = req.body;
        const [plan] = await db.query("SELECT * FROM tipos_suscripcion WHERE id_tipo = ?", [id_tipo]);
        if (plan.length === 0) return res.status(404).json({ error: "Plan no encontrado" });

        const expira = plan[0].precio === 0 ? null : new Date(Date.now() + plan[0].duracion_meses * 30 * 24 * 60 * 60 * 1000);

        await db.query(
            "UPDATE usuarios SET id_suscripcion_activa = ?, suscripcion_expira = ? WHERE id_usuario = ?",
            [id_tipo, expira, req.user.id]
        );

        await db.query(
            "INSERT INTO suscripciones (id_usuario, id_tipo, fecha_fin) VALUES (?, ?, ?)",
            [req.user.id, id_tipo, expira]
        );

        res.json({ message: `Plan ${plan[0].nombre} activado correctamente` });
    } catch (error) {
        res.status(500).json({ error: "Error activando suscripción", details: error.message });
    }
};

exports.verificarLimiteTorneos = async (id_usuario) => {
    const nivel = await exports.getNivel(id_usuario);
    const limites = { "Normal": 3, "Pro": 10, "Premium": Infinity };
    const limite = limites[nivel] || 3;

    if (limite === Infinity) return { permitido: true };

    const [rows] = await db.query(
        "SELECT COUNT(*) AS total FROM torneos WHERE creado_por = ?",
        [id_usuario]
    );
    const total = rows[0].total;
    return { permitido: total < limite, total, limite, nivel };
};

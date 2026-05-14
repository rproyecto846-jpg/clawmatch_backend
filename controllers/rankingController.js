const db = require("../config/db");

exports.registrarResultado = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const { id_usuario, marca } = req.body;

        // Verificar que el usuario está inscrito
        const [inscrito] = await db.query(
            "SELECT * FROM inscripciones_torneo WHERE id_torneo = ? AND id_usuario = ? AND estado = 'activo'",
            [id_torneo, id_usuario]
        );
        if (inscrito.length === 0) {
            return res.status(400).json({ error: "El usuario no está inscrito en este torneo" });
        }

        await db.query(
            "INSERT INTO resultados (id_torneo, id_usuario, marca) VALUES (?, ?, ?)",
            [id_torneo, id_usuario, marca]
        );
        res.status(201).json({ message: "Resultado registrado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error registrando resultado", details: error.message });
    }
};

exports.verRanking = async (req, res) => {
    try {
        const { id_torneo } = req.params;
        const [rows] = await db.query(
            `SELECT u.nombre_usuario, r.marca, r.fecha_registro,
                    RANK() OVER (ORDER BY r.marca ASC) AS posicion
             FROM resultados r
             JOIN usuarios u ON r.id_usuario = u.id_usuario
             WHERE r.id_torneo = ?
             ORDER BY posicion`,
            [id_torneo]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo ranking", details: error.message });
    }
};

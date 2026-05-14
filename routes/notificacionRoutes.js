const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM notificaciones WHERE id_usuario = ? ORDER BY fecha_envio DESC",
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo notificaciones", details: error.message });
    }
});

router.patch("/:id_notificacion/leer", authMiddleware, async (req, res) => {
    try {
        await db.query(
            "UPDATE notificaciones SET leido = TRUE WHERE id_notificacion = ? AND id_usuario = ?",
            [req.params.id_notificacion, req.user.id]
        );
        res.json({ message: "Notificación marcada como leída" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando notificación", details: error.message });
    }
});

module.exports = router;

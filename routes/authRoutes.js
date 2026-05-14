const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/uploads/"),
    filename: (req, file, cb) => cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`)
});

const fileFilter = async (req, file, cb) => {
    const esGif = file.mimetype === "image/gif";
    if (!esGif) return cb(null, true);

    try {
        const db = require("../config/db");
        const [rows] = await db.query(
            `SELECT t.nombre FROM usuarios u
             LEFT JOIN tipos_suscripcion t ON u.id_suscripcion_activa = t.id_tipo
             WHERE u.id_usuario = ?`,
            [req.user.id]
        );
        const nivel = rows[0]?.nombre || "Normal";
        if (nivel === "Pro" || nivel === "Premium") {
            cb(null, true);
        } else {
            cb(new Error("GIF_NO_PERMITIDO"));
        }
    } catch (e) {
        cb(new Error("Error verificando suscripción"));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/verificar", authController.verificarCuenta);
router.post("/reenviar-codigo", authController.reenviarCodigo);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/perfil", authMiddleware, authController.perfil);
router.put("/perfil", authMiddleware, authController.actualizarPerfil);
router.post("/perfil/foto", authMiddleware, (req, res, next) => {
    upload.single("foto")(req, res, (err) => {
        if (err?.message === "GIF_NO_PERMITIDO") {
            return res.status(403).json({ error: "Los GIFs solo están disponibles para planes Pro y Premium" });
        }
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}, authController.actualizarFoto);
router.post("/2fa/verificar", authController.verificar2FA);
router.post("/2fa/toggle", authMiddleware, authController.toggle2FA);
router.put("/perfil/personalizacion", authMiddleware, authController.actualizarPersonalizacion);

module.exports = router;

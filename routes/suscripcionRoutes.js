const express = require("express");
const router = express.Router();
const suscripcionController = require("../controllers/suscripcionController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/planes", suscripcionController.listarPlanes);
router.get("/mi-suscripcion", authMiddleware, suscripcionController.miSuscripcion);
router.post("/activar", authMiddleware, suscripcionController.activarSuscripcion);

module.exports = router;

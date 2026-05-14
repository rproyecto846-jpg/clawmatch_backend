const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pagoController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/crear-sesion", authMiddleware, pagoController.crearSesionPago);
router.post("/webhook", express.raw({ type: "application/json" }), pagoController.webhook);

module.exports = router;

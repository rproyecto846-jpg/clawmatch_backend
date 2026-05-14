const express = require("express");
const router = express.Router();
const inscripcionController = require("../controllers/inscripcionController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/:id_torneo/inscribirse", authMiddleware, inscripcionController.inscribirse);
router.get("/:id_torneo/participantes", authMiddleware, inscripcionController.listarParticipantes);
router.get("/mis-inscripciones", authMiddleware, inscripcionController.misInscripciones);

module.exports = router;

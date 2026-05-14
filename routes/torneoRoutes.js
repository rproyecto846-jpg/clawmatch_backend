const express = require("express");
const router = express.Router();
const torneoController = require("../controllers/torneoController");
const inscripcionController = require("../controllers/inscripcionController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, torneoController.listarTorneos);
router.post("/", authMiddleware, torneoController.crearTorneo);
router.get("/mis-inscripciones", authMiddleware, inscripcionController.misInscripciones);
router.get("/:id_torneo", authMiddleware, torneoController.verTorneo);
router.put("/:id_torneo", authMiddleware, torneoController.editarTorneo);
router.delete("/:id_torneo", authMiddleware, torneoController.borrarTorneo);

module.exports = router;

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.use(authMiddleware, adminMiddleware);

router.get("/usuarios", adminController.listarUsuarios);
router.patch("/usuarios/:id_usuario/estado", adminController.cambiarEstadoUsuario);
router.patch("/usuarios/:id_usuario/rol", adminController.cambiarRolUsuario);
router.patch("/usuarios/:id_usuario/banear", adminController.banearUsuario);
router.delete("/usuarios/:id_usuario", adminController.eliminarUsuario);
router.get("/logs", adminController.logsAcceso);
router.put("/torneos/:id_torneo", adminController.editarTorneo);
router.delete("/torneos/:id_torneo", adminController.borrarTorneo);
router.patch("/torneos/:id_torneo/expulsar/:id_usuario", adminController.expulsarParticipante);

module.exports = router;

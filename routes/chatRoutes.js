const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Chats privados y grupos
router.get("/", chatController.misChats);
router.post("/", chatController.crearChat);
router.get("/:id_chat/mensajes", chatController.mensajesChat);
router.post("/:id_chat/participantes", chatController.agregarParticipante);
router.get("/buscar-usuarios", chatController.buscarUsuarios);

// Salas públicas
router.get("/salas", chatController.listarSalasPublicas);
router.post("/salas", chatController.crearSalaPublica);
router.get("/salas/:id_sala/mensajes", chatController.mensajesSala);

// Chat global comunidad
router.get("/comunidad/:id_comunidad", chatController.mensajesComunidad);

module.exports = router;

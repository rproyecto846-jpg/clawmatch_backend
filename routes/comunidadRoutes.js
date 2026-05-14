const express = require("express");
const router = express.Router();
const c = require("../controllers/comunidadController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", c.listarComunidades);
router.post("/", c.crearComunidad);
router.get("/mis-comunidades", c.misComunidades);
router.get("/:id_comunidad", c.verComunidad);
router.post("/:id_comunidad/unirse", c.unirse);
router.post("/:id_comunidad/salir", c.salir);
router.get("/:id_comunidad/miembros", c.listarMiembros);
router.patch("/:id_comunidad/miembros/:id_usuario/rol", c.cambiarRolMiembro);
router.delete("/:id_comunidad/miembros/:id_usuario", c.expulsarMiembro);
router.get("/:id_comunidad/posts", c.listarPosts);
router.post("/:id_comunidad/posts", c.crearPost);
router.delete("/posts/:id_post", c.borrarPost);
router.get("/posts/:id_post/comentarios", c.listarComentarios);
router.post("/posts/:id_post/comentarios", c.crearComentario);
router.post("/posts/:id_post/votar", c.votarPost);
router.post("/comentarios/:id_comentario/like", c.votarComentario);
router.post("/comentarios/:id_comentario/corazon", c.corazonarComentario);
router.delete("/comentarios/:id_comentario", c.borrarComentario);

module.exports = router;

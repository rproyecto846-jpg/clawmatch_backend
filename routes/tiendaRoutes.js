const express = require("express");
const router = express.Router();
const tiendaController = require("../controllers/tiendaController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.get("/productos", authMiddleware, tiendaController.listarProductos);
router.get("/productos/:id_producto", authMiddleware, tiendaController.verProducto);
router.get("/carrito", authMiddleware, tiendaController.verCarrito);
router.post("/carrito", authMiddleware, tiendaController.añadirCarrito);
router.patch("/carrito/:id_carrito", authMiddleware, tiendaController.actualizarCantidad);
router.delete("/carrito/:id_carrito", authMiddleware, tiendaController.eliminarDelCarrito);
router.post("/pedidos", authMiddleware, tiendaController.realizarPedido);
router.get("/pedidos", authMiddleware, tiendaController.misPedidos);
router.post("/admin/productos", authMiddleware, adminMiddleware, tiendaController.crearProducto);
router.put("/admin/productos/:id_producto", authMiddleware, adminMiddleware, tiendaController.editarProducto);

module.exports = router;

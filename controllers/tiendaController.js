const db = require("../config/db");

exports.listarProductos = async (req, res) => {
    try {
        const { categoria } = req.query;
        let query = "SELECT * FROM productos WHERE activo = TRUE";
        const params = [];
        if (categoria) { query += " AND categoria = ?"; params.push(categoria); }
        query += " ORDER BY fecha_creacion DESC";
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo productos", details: error.message });
    }
};

exports.verProducto = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM productos WHERE id_producto = ? AND activo = TRUE", [req.params.id_producto]);
        if (rows.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo producto", details: error.message });
    }
};

exports.verCarrito = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.id_carrito, c.cantidad, p.id_producto, p.nombre, p.precio, p.imagen_url, p.stock
             FROM carrito c
             JOIN productos p ON c.id_producto = p.id_producto
             WHERE c.id_usuario = ?`,
            [req.user.id]
        );
        const total = rows.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        res.json({ items: rows, total: total.toFixed(2) });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo carrito", details: error.message });
    }
};

exports.añadirCarrito = async (req, res) => {
    try {
        const { id_producto, cantidad } = req.body;
        const [producto] = await db.query("SELECT * FROM productos WHERE id_producto = ? AND activo = TRUE", [id_producto]);
        if (producto.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
        if (producto[0].stock < cantidad) return res.status(400).json({ error: "Stock insuficiente" });

        const [existente] = await db.query(
            "SELECT * FROM carrito WHERE id_usuario = ? AND id_producto = ?",
            [req.user.id, id_producto]
        );

        if (existente.length > 0) {
            await db.query(
                "UPDATE carrito SET cantidad = cantidad + ? WHERE id_usuario = ? AND id_producto = ?",
                [cantidad || 1, req.user.id, id_producto]
            );
        } else {
            await db.query(
                "INSERT INTO carrito (id_usuario, id_producto, cantidad) VALUES (?, ?, ?)",
                [req.user.id, id_producto, cantidad || 1]
            );
        }
        res.json({ message: "Producto añadido al carrito" });
    } catch (error) {
        res.status(500).json({ error: "Error añadiendo al carrito", details: error.message });
    }
};

exports.actualizarCantidad = async (req, res) => {
    try {
        const { id_carrito } = req.params;
        const { cantidad } = req.body;
        if (cantidad <= 0) {
            await db.query("DELETE FROM carrito WHERE id_carrito = ? AND id_usuario = ?", [id_carrito, req.user.id]);
            return res.json({ message: "Producto eliminado del carrito" });
        }
        await db.query(
            "UPDATE carrito SET cantidad = ? WHERE id_carrito = ? AND id_usuario = ?",
            [cantidad, id_carrito, req.user.id]
        );
        res.json({ message: "Cantidad actualizada" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando carrito", details: error.message });
    }
};

exports.eliminarDelCarrito = async (req, res) => {
    try {
        await db.query("DELETE FROM carrito WHERE id_carrito = ? AND id_usuario = ?", [req.params.id_carrito, req.user.id]);
        res.json({ message: "Producto eliminado del carrito" });
    } catch (error) {
        res.status(500).json({ error: "Error eliminando del carrito", details: error.message });
    }
};

exports.realizarPedido = async (req, res) => {
    try {
        const { direccion_envio } = req.body;
        if (!direccion_envio) return res.status(400).json({ error: "La dirección de envío es obligatoria" });

        const [items] = await db.query(
            `SELECT c.cantidad, p.id_producto, p.nombre, p.precio, p.stock
             FROM carrito c JOIN productos p ON c.id_producto = p.id_producto
             WHERE c.id_usuario = ?`,
            [req.user.id]
        );
        if (items.length === 0) return res.status(400).json({ error: "El carrito está vacío" });

        for (const item of items) {
            if (item.stock < item.cantidad) return res.status(400).json({ error: `Stock insuficiente para ${item.nombre}` });
        }

        const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

        const [pedido] = await db.query(
            "INSERT INTO pedidos (id_usuario, total, direccion_envio) VALUES (?, ?, ?)",
            [req.user.id, total.toFixed(2), direccion_envio]
        );

        for (const item of items) {
            await db.query(
                "INSERT INTO pedido_items (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                [pedido.insertId, item.id_producto, item.cantidad, item.precio]
            );
            await db.query("UPDATE productos SET stock = stock - ? WHERE id_producto = ?", [item.cantidad, item.id_producto]);
        }

        await db.query("DELETE FROM carrito WHERE id_usuario = ?", [req.user.id]);

        res.status(201).json({ message: "Pedido realizado correctamente", id_pedido: pedido.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error realizando pedido", details: error.message });
    }
};

exports.misPedidos = async (req, res) => {
    try {
        const [pedidos] = await db.query(
            "SELECT * FROM pedidos WHERE id_usuario = ? ORDER BY fecha_pedido DESC",
            [req.user.id]
        );
        for (const pedido of pedidos) {
            const [items] = await db.query(
                `SELECT pi.*, p.nombre, p.imagen_url FROM pedido_items pi
                 JOIN productos p ON pi.id_producto = p.id_producto
                 WHERE pi.id_pedido = ?`,
                [pedido.id_pedido]
            );
            pedido.items = items;
        }
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo pedidos", details: error.message });
    }
};

// Admin
exports.crearProducto = async (req, res) => {
    try {
        const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
        await db.query(
            "INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria) VALUES (?, ?, ?, ?, ?, ?)",
            [nombre, descripcion, precio, stock || 0, imagen_url || null, categoria || null]
        );
        res.status(201).json({ message: "Producto creado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error creando producto", details: error.message });
    }
};

exports.editarProducto = async (req, res) => {
    try {
        const { nombre, descripcion, precio, stock, imagen_url, categoria, activo } = req.body;
        await db.query(
            "UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, imagen_url=?, categoria=?, activo=? WHERE id_producto=?",
            [nombre, descripcion, precio, stock, imagen_url, categoria, activo, req.params.id_producto]
        );
        res.json({ message: "Producto actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando producto", details: error.message });
    }
};

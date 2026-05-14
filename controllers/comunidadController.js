const db = require("../config/db");

exports.crearComunidad = async (req, res) => {
    try {
        const { nombre, descripcion, id_juego } = req.body;
        if (!nombre || !id_juego) return res.status(400).json({ error: "Nombre e id_juego son obligatorios" });

        const [result] = await db.query(
            "INSERT INTO comunidades (nombre, descripcion, id_juego, creador) VALUES (?, ?, ?, ?)",
            [nombre, descripcion, id_juego, req.user.id]
        );

        // El creador se une automáticamente como moderador
        await db.query(
            "INSERT INTO miembros_comunidad (id_comunidad, id_usuario, rol) VALUES (?, ?, 'moderador')",
            [result.insertId, req.user.id]
        );

        res.status(201).json({ message: "Comunidad creada correctamente", id_comunidad: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error creando comunidad", details: error.message });
    }
};

exports.listarComunidades = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, j.nombre AS juego, u.nombre_usuario AS creador_nombre,
                    COUNT(DISTINCT m.id_usuario) AS total_miembros
             FROM comunidades c
             JOIN juegos j ON c.id_juego = j.id_juego
             JOIN usuarios u ON c.creador = u.id_usuario
             LEFT JOIN miembros_comunidad m ON c.id_comunidad = m.id_comunidad
             WHERE c.estado = 'activa'
             GROUP BY c.id_comunidad
             ORDER BY total_miembros DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando comunidades", details: error.message });
    }
};

exports.verComunidad = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const [rows] = await db.query(
            `SELECT c.*, j.nombre AS juego, u.nombre_usuario AS creador_nombre,
                    COUNT(DISTINCT m.id_usuario) AS total_miembros
             FROM comunidades c
             JOIN juegos j ON c.id_juego = j.id_juego
             JOIN usuarios u ON c.creador = u.id_usuario
             LEFT JOIN miembros_comunidad m ON c.id_comunidad = m.id_comunidad
             WHERE c.id_comunidad = ?
             GROUP BY c.id_comunidad`,
            [id_comunidad]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Comunidad no encontrada" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo comunidad", details: error.message });
    }
};

exports.unirse = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const [existe] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [id_comunidad, req.user.id]
        );
        if (existe.length > 0) return res.status(400).json({ error: "Ya eres miembro de esta comunidad" });

        await db.query(
            "INSERT INTO miembros_comunidad (id_comunidad, id_usuario) VALUES (?, ?)",
            [id_comunidad, req.user.id]
        );
        res.json({ message: "Te has unido a la comunidad correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error uniéndose a la comunidad", details: error.message });
    }
};

exports.salir = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const [comunidad] = await db.query("SELECT * FROM comunidades WHERE id_comunidad = ?", [id_comunidad]);
        if (comunidad[0].creador === req.user.id) {
            return res.status(400).json({ error: "El creador no puede abandonar la comunidad" });
        }
        await db.query(
            "DELETE FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [id_comunidad, req.user.id]
        );
        res.json({ message: "Has salido de la comunidad" });
    } catch (error) {
        res.status(500).json({ error: "Error saliendo de la comunidad", details: error.message });
    }
};

exports.listarMiembros = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const [rows] = await db.query(
            `SELECT u.id_usuario, u.nombre_usuario, m.rol, m.fecha_union
             FROM miembros_comunidad m
             JOIN usuarios u ON m.id_usuario = u.id_usuario
             WHERE m.id_comunidad = ?
             ORDER BY m.rol DESC, m.fecha_union ASC`,
            [id_comunidad]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando miembros", details: error.message });
    }
};

exports.cambiarRolMiembro = async (req, res) => {
    try {
        const { id_comunidad, id_usuario } = req.params;
        const { rol } = req.body;

        const [comunidad] = await db.query("SELECT * FROM comunidades WHERE id_comunidad = ?", [id_comunidad]);
        if (comunidad[0].creador !== req.user.id && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso para cambiar roles" });
        }

        await db.query(
            "UPDATE miembros_comunidad SET rol = ? WHERE id_comunidad = ? AND id_usuario = ?",
            [rol, id_comunidad, id_usuario]
        );
        res.json({ message: "Rol actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error cambiando rol", details: error.message });
    }
};

exports.expulsarMiembro = async (req, res) => {
    try {
        const { id_comunidad, id_usuario } = req.params;
        const [comunidad] = await db.query("SELECT * FROM comunidades WHERE id_comunidad = ?", [id_comunidad]);

        const [miembroActual] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [id_comunidad, req.user.id]
        );
        const esModerador = miembroActual.length > 0 && miembroActual[0].rol === "moderador";
        if (comunidad[0].creador !== req.user.id && !esModerador && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso para expulsar miembros" });
        }

        await db.query(
            "DELETE FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [id_comunidad, id_usuario]
        );
        res.json({ message: "Miembro expulsado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error expulsando miembro", details: error.message });
    }
};

exports.crearPost = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const { titulo, contenido, imagen_url } = req.body;

        if (!titulo) return res.status(400).json({ error: "El título es obligatorio" });

        const [miembro] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [id_comunidad, req.user.id]
        );
        if (miembro.length === 0) return res.status(403).json({ error: "Debes ser miembro para publicar" });

        const [result] = await db.query(
            "INSERT INTO posts (id_comunidad, id_usuario, titulo, contenido, imagen_url) VALUES (?, ?, ?, ?, ?)",
            [id_comunidad, req.user.id, titulo, contenido || null, imagen_url || null]
        );
        res.status(201).json({ message: "Post publicado correctamente", id_post: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error creando post", details: error.message });
    }
};

exports.listarPosts = async (req, res) => {
    try {
        const { id_comunidad } = req.params;
        const id_usuario = req.user.id;
        const [rows] = await db.query(
            `SELECT p.*, u.nombre_usuario,
                    (SELECT COUNT(*) FROM comentarios c WHERE c.id_post = p.id_post) AS total_comentarios,
                    (SELECT COUNT(*) FROM post_votos v WHERE v.id_post = p.id_post AND v.tipo = 'like') AS likes,
                    (SELECT COUNT(*) FROM post_votos v WHERE v.id_post = p.id_post AND v.tipo = 'dislike') AS dislikes,
                    (SELECT v.tipo FROM post_votos v WHERE v.id_post = p.id_post AND v.id_usuario = ?) AS mi_voto
             FROM posts p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             WHERE p.id_comunidad = ?
             ORDER BY p.fecha_publicacion DESC`,
            [id_usuario, id_comunidad]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando posts", details: error.message });
    }
};

exports.borrarPost = async (req, res) => {
    try {
        const { id_post } = req.params;
        const [post] = await db.query("SELECT * FROM posts WHERE id_post = ?", [id_post]);
        if (post.length === 0) return res.status(404).json({ error: "Post no encontrado" });

        const [comunidad] = await db.query("SELECT * FROM comunidades WHERE id_comunidad = ?", [post[0].id_comunidad]);
        const [miembro] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [post[0].id_comunidad, req.user.id]
        );
        const esModerador = miembro.length > 0 && miembro[0].rol === "moderador";
        const esAutor = post[0].id_usuario === req.user.id;

        if (!esAutor && !esModerador && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso para borrar este post" });
        }

        await db.query("DELETE FROM comentarios WHERE id_post = ?", [id_post]);
        await db.query("DELETE FROM posts WHERE id_post = ?", [id_post]);
        res.json({ message: "Post eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error borrando post", details: error.message });
    }
};

exports.crearComentario = async (req, res) => {
    try {
        const { id_post } = req.params;
        const { contenido, imagen_url, id_padre } = req.body;

        if (!contenido && !imagen_url) return res.status(400).json({ error: "El comentario necesita texto o imagen" });

        const [post] = await db.query("SELECT * FROM posts WHERE id_post = ?", [id_post]);
        if (post.length === 0) return res.status(404).json({ error: "Post no encontrado" });

        const [miembro] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [post[0].id_comunidad, req.user.id]
        );
        if (miembro.length === 0) return res.status(403).json({ error: "Debes ser miembro para comentar" });

        const [result] = await db.query(
    "INSERT INTO comentarios (id_post, id_padre, id_usuario, contenido, imagen_url) VALUES (?, ?, ?, ?, ?)",
    [id_post, id_padre || null, req.user.id, contenido || null, imagen_url || null]
);
        res.status(201).json({ message: "Comentario publicado", id_comentario: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error creando comentario", details: error.message });
    }
};

exports.listarComentarios = async (req, res) => {
    try {
        const { id_post } = req.params;
        const id_usuario = req.user.id;
        const [rows] = await db.query(
            `SELECT c.*, u.nombre_usuario,
                    COUNT(DISTINCT cv.id_voto) AS likes,
                    MAX(CASE WHEN cv.id_usuario = ? THEN 1 END) AS yo_di_like,
                    MAX(CASE WHEN cc.id_usuario = ? THEN 1 END) AS tiene_corazon
             FROM comentarios c
             JOIN usuarios u ON c.id_usuario = u.id_usuario
             LEFT JOIN comentario_votos cv ON c.id_comentario = cv.id_comentario
             LEFT JOIN comentario_corazones cc ON c.id_comentario = cc.id_comentario
             WHERE c.id_post = ?
             GROUP BY c.id_comentario
             ORDER BY c.fecha_publicacion ASC`,
            [id_usuario, id_usuario, id_post]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error listando comentarios", details: error.message });
    }
};

exports.misComunidades = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, j.nombre AS juego, m.rol, m.fecha_union
             FROM miembros_comunidad m
             JOIN comunidades c ON m.id_comunidad = c.id_comunidad
             JOIN juegos j ON c.id_juego = j.id_juego
             WHERE m.id_usuario = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo comunidades", details: error.message });
    }
};

exports.votarPost = async (req, res) => {
    try {
        const { id_post } = req.params;
        const { tipo } = req.body; // 'like' o 'dislike'
        const id_usuario = req.user.id;

        const [existente] = await db.query(
            "SELECT * FROM post_votos WHERE id_post = ? AND id_usuario = ?",
            [id_post, id_usuario]
        );

        if (existente.length > 0) {
            if (existente[0].tipo === tipo) {
                // Quitar voto si es el mismo
                await db.query("DELETE FROM post_votos WHERE id_post = ? AND id_usuario = ?", [id_post, id_usuario]);
                return res.json({ message: "Voto eliminado" });
            } else {
                // Cambiar voto
                await db.query("UPDATE post_votos SET tipo = ? WHERE id_post = ? AND id_usuario = ?", [tipo, id_post, id_usuario]);
                return res.json({ message: "Voto actualizado" });
            }
        }

        await db.query("INSERT INTO post_votos (id_post, id_usuario, tipo) VALUES (?, ?, ?)", [id_post, id_usuario, tipo]);
        res.json({ message: "Voto registrado" });
    } catch (error) {
        res.status(500).json({ error: "Error votando", details: error.message });
    }
};

exports.votarComentario = async (req, res) => {
    try {
        const { id_comentario } = req.params;
        const id_usuario = req.user.id;

        const [existente] = await db.query(
            "SELECT * FROM comentario_votos WHERE id_comentario = ? AND id_usuario = ?",
            [id_comentario, id_usuario]
        );

        if (existente.length > 0) {
            await db.query("DELETE FROM comentario_votos WHERE id_comentario = ? AND id_usuario = ?", [id_comentario, id_usuario]);
            return res.json({ message: "Like eliminado" });
        }

        await db.query("INSERT INTO comentario_votos (id_comentario, id_usuario, tipo) VALUES (?, ?, 'like')", [id_comentario, id_usuario]);
        res.json({ message: "Like registrado" });
    } catch (error) {
        res.status(500).json({ error: "Error votando comentario", details: error.message });
    }
};

exports.corazonarComentario = async (req, res) => {
    try {
        const { id_comentario } = req.params;
        const id_usuario = req.user.id;

        // Solo el autor del post puede dar corazón
        const [comentario] = await db.query("SELECT * FROM comentarios WHERE id_comentario = ?", [id_comentario]);
        const [post] = await db.query("SELECT * FROM posts WHERE id_post = ?", [comentario[0].id_post]);

        if (post[0].id_usuario !== id_usuario) {
            return res.status(403).json({ error: "Solo el autor del post puede dar corazón" });
        }

        const [existente] = await db.query(
            "SELECT * FROM comentario_corazones WHERE id_comentario = ? AND id_usuario = ?",
            [id_comentario, id_usuario]
        );

        if (existente.length > 0) {
            await db.query("DELETE FROM comentario_corazones WHERE id_comentario = ? AND id_usuario = ?", [id_comentario, id_usuario]);
            return res.json({ message: "Corazón eliminado" });
        }

        await db.query("INSERT INTO comentario_corazones (id_comentario, id_usuario) VALUES (?, ?)", [id_comentario, id_usuario]);
        res.json({ message: "Corazón dado" });
    } catch (error) {
        res.status(500).json({ error: "Error dando corazón", details: error.message });
    }
};

exports.borrarComentario = async (req, res) => {
    try {
        const { id_comentario } = req.params;
        const [comentario] = await db.query("SELECT * FROM comentarios WHERE id_comentario = ?", [id_comentario]);
        if (comentario.length === 0) return res.status(404).json({ error: "Comentario no encontrado" });

        const [post] = await db.query("SELECT * FROM posts WHERE id_post = ?", [comentario[0].id_post]);
        const [miembro] = await db.query(
            "SELECT * FROM miembros_comunidad WHERE id_comunidad = ? AND id_usuario = ?",
            [post[0].id_comunidad, req.user.id]
        );
        const esModerador = miembro.length > 0 && miembro[0].rol === "moderador";
        const esAutor = comentario[0].id_usuario === req.user.id;

        if (!esAutor && !esModerador && req.user.rol !== "administrador") {
            return res.status(403).json({ error: "No tienes permiso" });
        }

        await db.query("DELETE FROM comentario_votos WHERE id_comentario = ?", [id_comentario]);
        await db.query("DELETE FROM comentario_corazones WHERE id_comentario = ?", [id_comentario]);
        await db.query("DELETE FROM comentarios WHERE id_comentario = ?", [id_comentario]);
        res.json({ message: "Comentario eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error borrando comentario", details: error.message });
    }
};

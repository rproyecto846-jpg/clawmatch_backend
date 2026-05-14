const db = require("../config/db");

exports.crearNotificacion = async (id_usuario, tipo, contenido) => {
    await db.query(
        "INSERT INTO notificaciones (id_usuario, tipo, contenido) VALUES (?, ?, ?)",
        [id_usuario, tipo, contenido]
    );
};

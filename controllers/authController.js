const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { enviarEmail } = require("../services/emailService");

exports.register = async (req, res) => {
    try {
        const { nombre_usuario, email, password, telefono } = req.body;
        const password_hash = await bcrypt.hash(password, 10);

        // Generar código de verificación
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await db.query(
            "INSERT INTO usuarios (nombre_usuario, email, password_hash, telefono, verificado, codigo_verificacion, codigo_expira) VALUES (?, ?, ?, ?, FALSE, ?, ?)",
            [nombre_usuario, email, password_hash, telefono || null, codigo, expira]
        );

        // Enviar email con código
        await enviarEmail(
            email,
            "Verifica tu cuenta de ClawMatch",
            `<h2>¡Bienvenido a ClawMatch!</h2>
             <p>Tu código de verificación es:</p>
             <h1 style="color:#e94560;letter-spacing:0.5rem">${codigo}</h1>
             <p>Este código expira en 15 minutos.</p>`
        );

        res.status(201).json({ message: "Usuario registrado. Revisa tu email para verificar la cuenta." });
   } catch (error) {
    console.error("ERROR REGISTER:", error);
    res.status(500).json({ error: "Error en el registro", details: error.message });
}
};

exports.verificarCuenta = async (req, res) => {
    try {
        const { email, codigo } = req.body;
        const [rows] = await db.query(
            "SELECT * FROM usuarios WHERE email = ?", [email]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = rows[0];
        if (user.verificado) return res.status(400).json({ error: "La cuenta ya está verificada" });
        if (user.codigo_verificacion !== codigo) return res.status(400).json({ error: "Código incorrecto" });
        if (new Date() > new Date(user.codigo_expira)) return res.status(400).json({ error: "El código ha expirado" });

        await db.query(
            "UPDATE usuarios SET verificado = TRUE, codigo_verificacion = NULL, codigo_expira = NULL WHERE email = ?",
            [email]
        );
        res.json({ message: "Cuenta verificada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error verificando cuenta", details: error.message });
    }
};

exports.reenviarCodigo = async (req, res) => {
    try {
        const { email } = req.body;
        const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        if (rows[0].verificado) return res.status(400).json({ error: "La cuenta ya está verificada" });

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expira = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            "UPDATE usuarios SET codigo_verificacion = ?, codigo_expira = ? WHERE email = ?",
            [codigo, expira, email]
        );

        await enviarEmail(
            email,
            "Nuevo código de verificación - ClawMatch",
            `<h2>Nuevo código de verificación</h2>
             <h1 style="color:#e94560;letter-spacing:0.5rem">${codigo}</h1>
             <p>Este código expira en 15 minutos.</p>`
        );

        res.json({ message: "Código reenviado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error reenviando código", details: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });

        const user = rows[0];

        if (!user.verificado) {
            return res.status(403).json({ error: "Cuenta no verificada", noVerificado: true, email });
        }

        if (user.estado !== "activo") {
            return res.status(403).json({ error: "Cuenta no activa" });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Contraseña incorrecta" });

        // Si tiene 2FA activo
        if (user.two_fa_activo) {
            const codigo = Math.floor(100000 + Math.random() * 900000).toString();
            const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            await db.query(
                "UPDATE usuarios SET two_fa_codigo = ?, two_fa_expira = ? WHERE id_usuario = ?",
                [codigo, expira, user.id_usuario]
            );

            await enviarEmail(
                email,
                "Código de verificación 2FA - ClawMatch",
                `<h2>Verificación en dos pasos</h2>
                 <p>Tu código de acceso es:</p>
                 <h1 style="color:#e94560;letter-spacing:0.5rem">${codigo}</h1>
                 <p>Este código expira en 10 minutos.</p>`
            );

            return res.json({ requiere2FA: true, email });
        }

        const token = jwt.sign(
            { id: user.id_usuario, nombre_usuario: user.nombre_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Error en el login", details: error.message });
    }
};

exports.perfil = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id_usuario, nombre_usuario, nickname, email, telefono, foto_perfil, rol, estado, 
             fecha_registro, two_fa_activo, id_suscripcion_activa, suscripcion_expira,
             color_perfil, banner_url, banner_tipo, color_acento, fuente
             FROM usuarios WHERE id_usuario = ?`,
            [req.user.id]
        );
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo perfil", details: error.message });
    }
};

exports.actualizarPerfil = async (req, res) => {
    try {
        const { nickname, telefono } = req.body;
        await db.query(
            "UPDATE usuarios SET nickname = ?, telefono = ? WHERE id_usuario = ?",
            [nickname || null, telefono || null, req.user.id]
        );
        res.json({ message: "Perfil actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando perfil", details: error.message });
    }
};

exports.actualizarFoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });
        const foto_perfil = `/uploads/${req.file.filename}`;
        await db.query(
            "UPDATE usuarios SET foto_perfil = ? WHERE id_usuario = ?",
            [foto_perfil, req.user.id]
        );
        res.json({ message: "Foto actualizada correctamente", foto_perfil });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando foto", details: error.message });
    }
};

exports.verificar2FA = async (req, res) => {
    try {
        const { email, codigo } = req.body;
        const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = rows[0];
        if (user.two_fa_codigo !== codigo) return res.status(400).json({ error: "Código incorrecto" });
        if (new Date() > new Date(user.two_fa_expira)) return res.status(400).json({ error: "El código ha expirado" });

        await db.query(
            "UPDATE usuarios SET two_fa_codigo = NULL, two_fa_expira = NULL WHERE id_usuario = ?",
            [user.id_usuario]
        );

        const token = jwt.sign(
            { id: user.id_usuario, nombre_usuario: user.nombre_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Error verificando 2FA", details: error.message });
    }
};

exports.toggle2FA = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT two_fa_activo FROM usuarios WHERE id_usuario = ?", [req.user.id]);
        const nuevoEstado = !rows[0].two_fa_activo;
        await db.query("UPDATE usuarios SET two_fa_activo = ? WHERE id_usuario = ?", [nuevoEstado, req.user.id]);
        res.json({ message: nuevoEstado ? "2FA activado" : "2FA desactivado", activo: nuevoEstado });
    } catch (error) {
        res.status(500).json({ error: "Error actualizando 2FA", details: error.message });
    }
};

exports.actualizarPersonalizacion = async (req, res) => {
    try {
        const { color_perfil, banner_url, banner_tipo, color_acento, fuente, remarco } = req.body;

        // Obtener nivel de suscripción
        const [rows] = await db.query(
            `SELECT t.nombre FROM usuarios u
             LEFT JOIN tipos_suscripcion t ON u.id_suscripcion_activa = t.id_tipo
             WHERE u.id_usuario = ?`,
            [req.user.id]
        );
        const nivel = rows[0]?.nombre || "Normal";

        // Validar según nivel
        if (banner_url && nivel === "Normal") {
            return res.status(403).json({ error: "Necesitas plan Pro o Premium para usar banner" });
        }
        
	if (nivel !== "Premium") {
    if (color_acento && color_acento !== "#e94560") {
        return res.status(403).json({ error: "Necesitas plan Premium para personalizar colores y fuentes" });
    }
    if (fuente && fuente !== "Segoe UI") {
        return res.status(403).json({ error: "Necesitas plan Premium para personalizar colores y fuentes" });
    }
}

        if (banner_tipo === "steam" && nivel !== "Premium") {
            return res.status(403).json({ error: "El fondo estilo Steam es exclusivo de Premium" });
        }

        await db.query(
            `UPDATE usuarios SET 
             color_perfil = COALESCE(?, color_perfil),
             banner_url = ?,
             banner_tipo = COALESCE(?, banner_tipo),
             color_acento = COALESCE(?, color_acento),
             fuente = COALESCE(?, fuente),
             remarco = COALESCE(?, remarco)
             WHERE id_usuario = ?`,
            [color_perfil, banner_url || null, banner_tipo, color_acento, fuente, remarco || "ninguno", req.user.id]
        );

        res.json({ message: "Personalización guardada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error guardando personalización", details: error.message });
    }
};

module.exports = (req, res, next) => {
    if (req.user.rol !== "administrador") {
        return res.status(403).json({ error: "Acceso denegado, se requiere rol administrador" });
    }
    next();
};

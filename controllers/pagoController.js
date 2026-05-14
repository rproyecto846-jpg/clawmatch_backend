const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../config/db");

exports.crearSesionPago = async (req, res) => {
    try {
        const { id_tipo } = req.body;
        const [plan] = await db.query("SELECT * FROM tipos_suscripcion WHERE id_tipo = ?", [id_tipo]);
        if (plan.length === 0) return res.status(404).json({ error: "Plan no encontrado" });

        const [usuario] = await db.query("SELECT * FROM usuarios WHERE id_usuario = ?", [req.user.id]);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer_email: usuario[0].email,
            line_items: [{
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: `ClawMatch ${plan[0].nombre}`,
                        description: plan[0].descripcion,
                    },
                    unit_amount: Math.round(plan[0].precio * 100),
                },
                quantity: 1,
            }],
            metadata: {
                id_usuario: req.user.id,
                id_tipo: id_tipo
            },
            success_url: `${process.env.APP_URL}/pago-exitoso.html?plan=${plan[0].nombre}`,
            cancel_url: `${process.env.APP_URL}/suscripciones.html`,
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: "Error creando sesión de pago", details: error.message });
    }
};

exports.webhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const id_usuario = session.metadata.id_usuario;
        const id_tipo = session.metadata.id_tipo;

        const [plan] = await db.query("SELECT * FROM tipos_suscripcion WHERE id_tipo = ?", [id_tipo]);
        const expira = new Date(Date.now() + plan[0].duracion_meses * 30 * 24 * 60 * 60 * 1000);

        await db.query(
            "UPDATE usuarios SET id_suscripcion_activa = ?, suscripcion_expira = ? WHERE id_usuario = ?",
            [id_tipo, expira, id_usuario]
        );

        await db.query(
            "INSERT INTO suscripciones (id_usuario, id_tipo, fecha_fin) VALUES (?, ?, ?)",
            [id_usuario, id_tipo, expira]
        );
    }

    res.json({ received: true });
};

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.enviarEmail = async (destinatario, asunto, html) => {
    await resend.emails.send({
        from: "ClawMatch <onboarding@resend.dev>",
        to: destinatario,
        subject: asunto,
        html,
    });
};

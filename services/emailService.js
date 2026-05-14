const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.enviarEmail = async (destinatario, asunto, html) => {
    await transporter.sendMail({
        from: `"ClawMatch" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: asunto,
        html,
    });
};

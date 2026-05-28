const Brevo = require("@getbrevo/brevo");

const client = Brevo.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new Brevo.TransactionalEmailsApi();

exports.enviarEmail = async (destinatario, asunto, html) => {
    const email = new Brevo.SendSmtpEmail();
    email.to = [{ email: destinatario }];
    email.sender = { email: "noreply@clawmatch.onrender.com", name: "ClawMatch" };
    email.subject = asunto;
    email.htmlContent = html;
    await apiInstance.sendTransacEmail(email);
};

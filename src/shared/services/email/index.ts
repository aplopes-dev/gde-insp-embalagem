// Serviço de e-mail usando Nodemailer
// - Em produção: usar SMTP via variáveis de ambiente
// - Em desenvolvimento: se não houver SMTP, usa Ethereal e imprime a URL de preview no log

import nodemailer from "nodemailer";

export type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return null;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  let transporter = getTransport();
  let info;

  const from = process.env.EMAIL_FROM || "no-reply@gde.local";

  if (!transporter) {
    // Fallback dev: Ethereal
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  info = await transporter.sendMail({ from, to, subject, html, text });

  // Se for Ethereal, mostra URL de preview no log para facilitar testes
  if (nodemailer.getTestMessageUrl && info) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log("[E-MAIL PREVIEW]", preview);
  }

  return info;
}

export async function sendPasswordResetEmail(params: { to: string; token: string; identifier: string; baseUrl: string }) {
  const { to, token, identifier, baseUrl } = params;
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&identifier=${encodeURIComponent(identifier)}`;
  await sendEmail({
    to,
    subject: "Recuperação de Senha - GDE",
    html: `
      <p>Você solicitou a redefinição de senha.</p>
      <p>Clique no link abaixo para definir uma nova senha (válido por 1 hora):</p>
      <p><a href="${resetUrl}">Redefinir senha</a></p>
      <p>Se você não solicitou, ignore este e-mail.</p>
    `,
    text: `Abra este link para redefinir sua senha: ${resetUrl}`,
  });
}


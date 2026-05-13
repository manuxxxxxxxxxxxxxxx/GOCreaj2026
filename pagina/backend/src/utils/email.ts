import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM     = process.env.EMAIL_FROM || 'LocalMarket <noreply@localmarket.com>';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

const wrap = (body: string) => `
  <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px">
    <div style="margin-bottom:24px">
      <span style="font-size:1.3rem;font-weight:800;color:#4f6ef7">LocalMarket</span>
    </div>
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:.78rem">
      Si no realizaste esta acción, puedes ignorar este correo de forma segura.
    </p>
  </div>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4f6ef7,#8b3cf7);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:.95rem;margin:16px 0">${label}</a>`;

export const sendVerificationEmail = (email: string, name: string, token: string) =>
  transporter.sendMail({
    from: FROM, to: email,
    subject: 'Verifica tu cuenta en LocalMarket',
    html: wrap(`
      <h2 style="color:#1a1a2e;margin:0 0 8px">¡Bienvenido, ${name}! 👋</h2>
      <p style="color:#64748b">Haz clic en el botón para activar tu cuenta. El enlace expira en <strong>24 horas</strong>.</p>
      ${btn(`${FRONTEND}/verify-email?token=${token}`, 'Verificar mi cuenta')}
    `),
  });

export const sendPasswordResetEmail = (email: string, name: string, token: string) =>
  transporter.sendMail({
    from: FROM, to: email,
    subject: 'Restablecer contraseña — LocalMarket',
    html: wrap(`
      <h2 style="color:#1a1a2e;margin:0 0 8px">Restablecer contraseña</h2>
      <p style="color:#64748b">Hola ${name}, recibimos una solicitud para cambiar tu contraseña. El enlace expira en <strong>1 hora</strong>.</p>
      ${btn(`${FRONTEND}/reset-password?token=${token}`, 'Restablecer contraseña')}
    `),
  });

export const sendRoleApprovedEmail = (email: string, name: string, role: string) => {
  const labels: Record<string, string> = { seller: 'Vendedor', driver: 'Repartidor' };
  return transporter.sendMail({
    from: FROM, to: email,
    subject: `¡Tu cuenta de ${labels[role] || role} fue aprobada! — LocalMarket`,
    html: wrap(`
      <h2 style="color:#1a1a2e;margin:0 0 8px">¡Cuenta aprobada! 🎉</h2>
      <p style="color:#64748b">Hola ${name}, tu cuenta de <strong>${labels[role] || role}</strong> en LocalMarket fue verificada y aprobada. Ya puedes acceder a tu dashboard.</p>
      ${btn(`${FRONTEND}/dashboard`, 'Ir a mi dashboard')}
    `),
  });
};

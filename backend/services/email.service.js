import nodemailer from "nodemailer";

let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are not configured");
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: String(process.env.EMAIL_SECURE || "false").toLowerCase() === "true",
    // Render's network has no outbound IPv6 route; Gmail's SMTP host resolves
    // to an IPv6 address first, causing ENETUNREACH unless we pin IPv4.
    family: 4,
    // Fail fast instead of hanging when SMTP is unreachable or misconfigured.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const mailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transport = getTransporter();
  return transport.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html,
  });
};

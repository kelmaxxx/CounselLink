import nodemailer from "nodemailer";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const parseSender = (raw) => {
  if (!raw) return null;
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || "CounselLink", email: match[2].trim() };
  return { name: "CounselLink", email: raw.trim() };
};

const sendViaBrevo = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = parseSender(process.env.EMAIL_FROM || process.env.EMAIL_USER);
  if (!sender?.email) throw new Error("EMAIL_FROM is not configured");

  const payload = { sender, to: [{ email: to }], subject };
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${detail || res.statusText}`);
  }
  return res.json().catch(() => ({}));
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
    text,
  });
};

// Use Brevo when BREVO_API_KEY is set, otherwise fall back to SMTP (nodemailer).
// Configure one of these blocks in .env:
//   Option A (Brevo): BREVO_API_KEY + EMAIL_FROM
//   Option B (SMTP):  EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
export const sendEmail = async (opts) => {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(opts);
  }
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return sendViaSmtp(opts);
  }
  throw new Error(
    "No email transport configured. Set BREVO_API_KEY or EMAIL_USER + EMAIL_PASS in .env"
  );
};

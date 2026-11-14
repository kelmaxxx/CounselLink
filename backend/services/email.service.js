import nodemailer from "nodemailer";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Host dashboards (Render, Vercel) often store the value with the surrounding
// quotes copied from .env, e.g. `"CounselLink <a@b.com>"`. Accept that, the
// bare `Name <a@b.com>` form, and a plain address. Returns null when the value
// has no usable address, so callers can fail with a clear message instead of
// letting Brevo answer "valid sender email required".
export const parseSender = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim().replace(/^"(.*)"$/s, "$1").trim();
  const angled = value.match(/<([^>]+)>/);
  const email = (angled ? angled[1] : value).trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  const name = angled ? value.replace(/<[^>]+>/, "").trim() || "CounselLink" : "CounselLink";
  return { name, email };
};

const sendViaBrevo = async ({ to, subject, html, text }) => {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  const sender = parseSender(process.env.EMAIL_FROM || process.env.EMAIL_USER);
  if (!sender) {
    throw new Error(
      `Invalid email sender: EMAIL_FROM=${JSON.stringify(process.env.EMAIL_FROM ?? null)} ` +
        `(expected "Name <verified@address>" or a plain address)`
    );
  }

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

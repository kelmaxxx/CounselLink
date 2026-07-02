// Email is sent through Brevo's HTTP API (https://api.brevo.com) instead of
// raw SMTP. Render blocks outbound SMTP ports (25/465/587), so nodemailer +
// Gmail times out in production; an HTTPS API on port 443 is never blocked.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Accept a sender configured either as a bare address ("me@gmail.com") or in
// the common "Name <me@gmail.com>" form, and split it into the { name, email }
// shape Brevo expects. The email MUST be a verified sender in your Brevo
// account, otherwise the API rejects the request.
const parseSender = (raw) => {
  if (!raw) return null;
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || "CounselLink", email: match[2].trim() };
  }
  return { name: "CounselLink", email: raw.trim() };
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const sender = parseSender(process.env.EMAIL_FROM || process.env.EMAIL_USER);
  if (!sender?.email) {
    throw new Error("EMAIL_FROM (a verified Brevo sender) is not configured");
  }

  const payload = {
    sender,
    to: [{ email: to }],
    subject,
  };
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

  // Surface Brevo's error body (e.g. unverified sender, bad key) so the
  // password-reset catch handler logs something actionable instead of a bare
  // status code.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${detail || res.statusText}`);
  }

  return res.json().catch(() => ({}));
};

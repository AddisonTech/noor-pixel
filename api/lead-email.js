// /api/lead-email.js
import { Resend } from "resend";

// Ensure we're on the Node API runtime (so Buffer is available)
export const config = { api: { bodyParser: true } };

const resend = new Resend(process.env.RESEND_API_KEY);

// Tiny 1x1 GIF (for GET beacon fallback)
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

// ---- CORS helpers ----
function setCors(res) {
  // For testing you can leave '*' — when you’re done, lock to your domain:
  // res.setHeader('Access-Control-Allow-Origin', 'https://www.glowwithnoor.com');
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ---- email sender ----
async function sendEmail({
  name = "",
  email = "",
  phone = "",
  service = "",
  form_id = "",
  source = "",
  message = "",
}) {
  const from =
    process.env.LEAD_EMAIL_FROM || "Noor Leads <no-reply@nooraesthetics.com>";
  const to = process.env.LEAD_EMAIL_TO || "karrie@glowwithnoor.com";

  // Defensive: basic text escaping for message lines
  const safeMessage =
    typeof message === "string"
      ? message.replace(/[<>]/g, "").replace(/\n/g, "<br>")
      : "";

  await resend.emails.send({
    from,
    to,
    subject: service ? `New Lead: ${service}` : "New Lead Submitted",
    html: `
      <h2>New Lead</h2>
      <p><strong>Name:</strong> ${name || "N/A"}</p>
      <p><strong>Email:</strong> ${email || "N/A"}</p>
      <p><strong>Phone:</strong> ${phone || "N/A"}</p>
      <p><strong>Service:</strong> ${service || "N/A"}</p>
      <p><strong>Form ID:</strong> ${form_id || "N/A"}</p>
      <p><strong>Source:</strong> ${source || "N/A"}</p>
      ${safeMessage ? `<p><strong>Message:</strong><br>${safeMessage}</p>` : ""}
    `,
  });
}

// ---- handler ----
export default async function handler(req, res) {
  setCors(res);

  // Preflight (CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "POST") {
      // WP/JS fetch may send a string body; normalize it
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

      await sendEmail(body);
      return res.status(200).json({ success: true });
    }

    if (req.method === "GET") {
      // GET beacon fallback: pull data from query-string
      const { name, email, phone, service, form_id, source, message } =
        req.query || {};

      await sendEmail({ name, email, phone, service, form_id, source, message });

      // Return a 1x1 gif so it behaves like an image pixel
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Content-Length", GIF.length);
      return res.status(200).end(GIF);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("lead-email error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

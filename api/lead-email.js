// /api/lead-email.js
import { Resend } from "resend";

// Ensure Node runtime (pages/api uses Node by default)
export const config = { api: { bodyParser: true } };

const resend = new Resend(process.env.RESEND_API_KEY);

// 1x1 GIF for GET beacon fallback
const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

// ---------- CORS ----------
function setCors(res) {
  // Lock to your live site
  res.setHeader("Access-Control-Allow-Origin", "https://www.glowwithnoor.com");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ---------- email sender ----------
async function sendEmail(payload = {}) {
  const {
    name = "",
    email = "",
    phone = "",
    service = "",
    form_id = "",
    source = "",
    message = "",
  } = payload || {};

  // Use your verified domain
  const from =
    process.env.LEAD_EMAIL_FROM || "Noor Aesthetics <noreply@glowwithnoor.com>";
  const to = (process.env.LEAD_EMAIL_TO || "karrie@glowwithnoor.com")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const safe = (s) =>
    typeof s === "string" ? s.replace(/[<>]/g, "").trim() : "";

  const html = `
    <h2>New Noor lead</h2>
    <p><strong>Name:</strong> ${safe(name) || "N A"}</p>
    <p><strong>Email:</strong> ${safe(email) || "N A"}</p>
    <p><strong>Phone:</strong> ${safe(phone) || "N A"}</p>
    <p><strong>Service:</strong> ${safe(service) || "N A"}</p>
    <p><strong>Form ID:</strong> ${safe(form_id) || "N A"}</p>
    <p><strong>Source:</strong> ${safe(source) || "N A"}</p>
    ${
      message
        ? `<p><strong>Message:</strong><br>${safe(message).replace(/\n/g, "<br>")}</p>`
        : ""
    }
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: service ? `New Lead: ${safe(service)}` : "New Lead Submitted",
    html,
    reply_to: safe(email) || undefined,
  });

  // Helpful in Vercel logs
  console.log("Resend send result:", result);

  if (result?.error) {
    const msg = result.error?.message || "Resend error";
    throw new Error(msg);
  }

  return result?.data?.id || null;
}

// ---------- handler ----------
export default async function handler(req, res) {
  setCors(res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const id = await sendEmail(body);
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "GET") {
      const { name, email, phone, service, form_id, source, message } =
        req.query || {};
      await sendEmail({ name, email, phone, service, form_id, source, message });

      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Content-Length", GIF.length);
      return res.status(200).end(GIF);
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("lead-email error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Failed to send" });
  }
}

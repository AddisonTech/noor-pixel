// pages/api/lead-email.js
import { Resend } from "resend";

// Ensure Node runtime (pages/api is Node by default)
export const config = { api: { bodyParser: true } };

const resend = new Resend(process.env.RESEND_API_KEY);

// 1x1 GIF for GET beacon fallback
const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

// ---------- CORS ----------
const ALLOWLIST = new Set([
  "https://www.glowwithnoor.com",
  "https://glowwithnoor.com",
  // "http://localhost:3000", // uncomment for local testing if needed
]);

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWLIST.has(origin) ? origin : "*"; // fallback to * if unknown
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");

  // Allow common methods & preflight cache
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    // WordPress/jQuery often send X-Requested-With; allow a broad set
    "Content-Type, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
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

  const from =
    process.env.LEAD_EMAIL_FROM ||
    "Noor Aesthetics <noreply@glowwithnoor.com>"; // verified domain
  const to = (process.env.LEAD_EMAIL_TO || "karrie@glowwithnoor.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const safe = (s) =>
    typeof s === "string" ? s.replace(/[<>]/g, "").trim() : "";

  const html = `
    <h2>New Noor lead</h2>
    <p><strong>Name:</strong> ${safe(name) || "N/A"}</p>
    <p><strong>Email:</strong> ${safe(email) || "N/A"}</p>
    <p><strong>Phone:</strong> ${safe(phone) || "N/A"}</p>
    <p><strong>Service:</strong> ${safe(service) || "N/A"}</p>
    <p><strong>Form ID:</strong> ${safe(form_id) || "N/A"}</p>
    <p><strong>Source:</strong> ${safe(source) || "N/A"}</p>
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

  console.log("[lead-email] Resend result:", {
    ok: !result?.error,
    id: result?.data?.id,
    err: result?.error?.message,
  });

  if (result?.error) {
    throw new Error(result.error.message || "Resend error");
  }
  return result?.data?.id || null;
}

// ---------- handler ----------
export default async function handler(req, res) {
  applyCors(req, res);

  // Preflight must return with CORS headers
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") {
      // WordPress/jQuery sometimes send body as string
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      console.log("[lead-email] POST payload keys:", Object.keys(body || {}));
      const id = await sendEmail(body);
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "GET") {
      // GET beacon fallback
      const { name, email, phone, service, form_id, source, message } =
        req.query || {};
      console.log("[lead-email] GET beacon hit");
      await sendEmail({ name, email, phone, service, form_id, source, message });

      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Content-Length", GIF.length);
      return res.status(200).end(GIF);
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[lead-email] Error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Failed to send" });
  }
}

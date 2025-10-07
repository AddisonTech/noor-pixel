// pages/api/lead-email.js   (or api/lead-email.js at repo root for Vercel “Other”)
import { Resend } from "resend";

export const config = { api: { bodyParser: true } };

const resend = new Resend(process.env.RESEND_API_KEY);

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

// ---------- CORS ----------
const ALLOWLIST = new Set([
  "https://www.glowwithnoor.com",
  "https://glowwithnoor.com",
]);

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWLIST.has(origin) ? origin : "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
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

  if (req.method === "OPTIONS") return res.status(204).end();

  const isDebug =
    req.method === "GET" && (req.query?.debug === "1" || req.headers["x-debug"] === "1");

  try {
    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      console.log("[lead-email] POST keys:", Object.keys(body || {}));
      const id = await sendEmail(body);
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "GET") {
      const { name, email, phone, service, form_id, source, message } =
        req.query || {};
      console.log("[lead-email] GET beacon hit");

      try {
        const id = await sendEmail({
          name,
          email,
          phone,
          service,
          form_id,
          source,
          message,
        });

        if (isDebug) return res.status(200).json({ ok: true, id });

        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Content-Length", GIF.length);
        return res.status(200).end(GIF);
      } catch (e) {
        // In debug mode, show the exact error text to the browser
        if (isDebug) {
          return res
            .status(500)
            .json({ ok: false, error: e?.message || "sendEmail failed" });
        }
        throw e; // otherwise fall through to global catch
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[lead-email] Error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Failed to send" });
  }
}

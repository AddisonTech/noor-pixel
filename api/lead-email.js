// api/lead-email.js  (or pages/api/lead-email.js if Next.js Pages)
import { Resend } from "resend";

export const config = { api: { bodyParser: true } };

const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = new Resend(resendApiKey);

// ---------- CORS ----------
const ALLOWLIST = new Set([
  "https://www.glowwithnoor.com",
  "https://glowwithnoor.com",
  // "http://localhost:3000", // for local dev
]);

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allow = ALLOWLIST.has(origin) ? origin : "*";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

const ok = (res, data = {}) => res.status(200).json({ ok: true, ...data });
const err = (res, message = "Unknown error", extra = {}) =>
  res.status(200).json({ ok: false, error: String(message), ...extra });

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

  // HARD-CODED FROM to rule out bad env var during debug.
  const from = "Noor Aesthetics <noreply@glowwithnoor.com>";

  // You can comma-separate multiple recipients in LEAD_EMAIL_TO
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

  console.log("[lead-email] Resend result", {
    ok: !result?.error,
    id: result?.data?.id,
    err: result?.error?.message,
  });

  if (result?.error) {
    throw new Error(result.error.message || "Resend send error");
  }
  return result?.data?.id || null;
}

// ---------- handler ----------
export default async function handler(req, res) {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();

    // PROBE: confirm route deploy & env presence without sending mail
    if (req.method === "GET" && req.query?.probe === "1") {
      return ok(res, {
        route: "/api/lead-email",
        env_present: {
          RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
          LEAD_EMAIL_FROM: Boolean(process.env.LEAD_EMAIL_FROM),
          LEAD_EMAIL_TO: Boolean(process.env.LEAD_EMAIL_TO),
        },
      });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      console.log("[lead-email] POST keys:", Object.keys(body || {}));

      if (!resendApiKey) {
        return err(res, "RESEND_API_KEY is missing in this environment");
      }
      const id = await sendEmail(body);
      return ok(res, { id });
    }

    if (req.method === "GET") {
      // Debug send from URL params (no pixel/gif to simplify debugging)
      const { name, email, phone, service, form_id, source, message } =
        req.query || {};

      if (!resendApiKey) {
        return err(res, "RESEND_API_KEY is missing in this environment");
      }
      const id = await sendEmail({
        name,
        email,
        phone,
        service,
        form_id,
        source,
        message,
      });
      return ok(res, { id });
    }

    return err(res, "Method not allowed");
  } catch (e) {
    console.error("[lead-email] Fatal error:", e);
    return err(res, e?.message || e || "Failed to send");
  }
}

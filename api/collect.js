export const config = { api: { bodyParser: true } };

const META_PIXEL_ID = process.env.META_PIXEL_ID || "";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || "";

const GOOD_EVENTS = new Set([
  "service_selected",
  "appointment_booked",
  "call_request",
  "checkout_complete",
  "reviews_viewed",
  "site_and_facebook_touched",
  "specific_service_requested",
  "post_read_15s",
  "post_read_30s",
  "post_read_60s",
  "key_page_view"
]);

function isGoodLead(ev){
  if (ev.good_lead === true) return true;
  return GOOD_EVENTS.has(ev.event);
}

async function sha256Hex(input){
  const enc = new TextEncoder().encode((input || "").trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function sendToMeta(ev){
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) return;

  const user_data = {
    em: ev.email ? [await sha256Hex(ev.email)] : undefined,
    ph: ev.phone ? [await sha256Hex(ev.phone)] : undefined,
    client_user_agent: ev.user_agent || undefined,
    fbc: ev.fbclid ? `fb.1.${Math.floor((ev.ts||Date.now())/1000)}.${ev.fbclid}` : undefined
  };

  const custom_data = {
    currency: ev.currency || "USD",
    value: ev.value ? Number(ev.value) : undefined,
    content_category: ev.service || undefined
  };

  const body = {
    data: [{
      event_name: ev.event,
      event_time: Math.floor((ev.ts || Date.now()) / 1000),
      action_source: "website",
      event_source_url: ev.url || undefined,
      user_data,
      custom_data,
      test_event_code: META_TEST_EVENT_CODE || undefined
    }]
  };

  await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  }).catch(()=>{});
}

function normalize(req, body){
  const ev = body || {};
  ev.ts = ev.ts || Date.now();
  ev.user_agent = req.headers["user-agent"] || null;
  return ev;
}

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"POST only" });
  try {
    const ev = normalize(req, req.body || {});
    console.log("noor_event", ev);

    if (isGoodLead(ev)) {
      await sendToMeta(ev);
    }
    res.status(200).json({ ok:true });
  } catch(e){
    res.status(500).json({ ok:false });
  }
}

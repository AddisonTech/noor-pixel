// /api/lead-email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// handy tiny 1x1 gif buffer
const GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // or 'https://www.glowwithnoor.com'
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function sendEmail({ name = '', email = '', phone = '', service = '', form_id = '', source = '', message = '' }) {
  const from = process.env.LEAD_EMAIL_FROM || 'Noor Leads <no-reply@nooraesthetics.com>';
  const to   = process.env.LEAD_EMAIL_TO   || 'karrie@glowwithnoor.com';

  await resend.emails.send({
    from,
    to,
    subject: service ? `New Lead: ${service}` : 'New Lead Submitted',
    html: `
      <h2>New Lead</h2>
      <p><strong>Name:</strong> ${name || 'N/A'}</p>
      <p><strong>Email:</strong> ${email || 'N/A'}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Service:</strong> ${service || 'N/A'}</p>
      <p><strong>Form ID:</strong> ${form_id || 'N/A'}</p>
      <p><strong>Source:</strong> ${source || 'N/A'}</p>
      ${message ? `<p><strong>Message:</strong><br>${String(message).replace(/\n/g,'<br>')}</p>` : ''}
    `,
  });
}

export default async function handler(req, res) {
  setCors(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      await sendEmail(payload);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      // Accept query params for CORS-free beacon usage
      const { name, email, phone, service, form_id, source, message } = req.query || {};
      await sendEmail({ name, email, phone, service, form_id, source, message });
      // return a 1x1 gif so it behaves like an image beacon
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Content-Length', GIF.length);
      return res.status(200).end(GIF);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('lead-email error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

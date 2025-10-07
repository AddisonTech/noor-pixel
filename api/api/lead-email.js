import { Resend } from 'resend';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  // --- CORS (keep * while testing; later restrict to your domain) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // or 'https://www.glowwithnoor.com'
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, service, message, form_id, source } =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const resend = new Resend(process.env.RESEND_API_KEY);

    const from = process.env.LEAD_EMAIL_FROM || 'Noor Leads <no-reply@nooraesthetics.com>';
    const to   = process.env.LEAD_EMAIL_TO   || 'karrie@glowwithnoor.com';

    await resend.emails.send({
      from,
      to,
      subject: `New Lead${service ? `: ${service}` : ''}`,
      html: `
        <h2>New Lead</h2>
        <p><strong>Name:</strong> ${name || 'N/A'}</p>
        <p><strong>Email:</strong> ${email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Service:</strong> ${service || 'N/A'}</p>
        <p><strong>Form ID:</strong> ${form_id || 'N/A'}</p>
        <p><strong>Source:</strong> ${source || 'N/A'}</p>
        <p><strong>Message:</strong><br>${(message || '').toString().replace(/\n/g,'<br>')}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('lead-email error:', error);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}

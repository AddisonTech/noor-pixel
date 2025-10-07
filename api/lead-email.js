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
      <p><stro

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone, form_id, source } = req.body;

    await resend.emails.send({
      from: 'Noor Leads <no-reply@nooraesthetics.com>',
      to: 'karrie@glowwithinnoor.com',
      subject: 'New Lead Submitted!',
      html: `
        <h2>New Lead</h2>
        <p><strong>Email:</strong> ${email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Form ID:</strong> ${form_id || 'N/A'}</p>
        <p><strong>Source:</strong> ${source || 'N/A'}</p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}

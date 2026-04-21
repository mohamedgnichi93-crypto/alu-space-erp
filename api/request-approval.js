const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = 'https://alu-space-erp.vercel.app';
const ADMIN_EMAIL = 'mohamedgnichi93@gmail.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const { data: existing } = await supabase
    .from('device_approvals')
    .select('status')
    .eq('email', email.toLowerCase())
    .eq('status', 'approved')
    .maybeSingle();

  if (existing) return res.status(200).json({ approved: true });

  const { data: approval, error } = await supabase
    .from('device_approvals')
    .insert({ email: email.toLowerCase() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const approveUrl = `${APP_URL}/api/approve?token=${approval.token}`;
  const rejectUrl = `${APP_URL}/api/reject?token=${approval.token}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ALU SPACE ERP <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `🔐 Demande d'accès — ${email}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#c0392b;margin-bottom:8px;">ALU SPACE ERP</h2>
          <p style="color:#666;margin-bottom:24px;">Nouvelle demande de connexion reçue</p>
          <div style="background:#f8f9fa;padding:16px;border-radius:6px;margin-bottom:24px;">
            <p style="margin:0;font-size:16px;">Adresse email :</p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:bold;color:#2c3e50;">${email}</p>
          </div>
          <p style="margin-bottom:24px;">Voulez-vous autoriser cette personne à accéder à l'application ?</p>
          <div style="display:flex;gap:12px;">
            <a href="${approveUrl}" 
               style="background:#27ae60;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              ✅ Accepter
            </a>
            &nbsp;&nbsp;
            <a href="${rejectUrl}" 
               style="background:#e74c3c;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              ❌ Refuser
            </a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px;">Ce lien expire dans 30 minutes.</p>
        </div>
      `
    })
  });

  res.status(200).json({ approved: false, message: 'Demande envoyée' });
};

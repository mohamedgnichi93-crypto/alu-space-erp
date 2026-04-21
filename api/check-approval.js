const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APP_URL = 'https://alu-space-erp.vercel.app';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ approved: false });

  const { data } = await supabase
    .from('device_approvals')
    .select('status')
    .eq('email', email.toLowerCase())
    .eq('status', 'approved')
    .maybeSingle();

  res.status(200).json({ approved: !!data });
};

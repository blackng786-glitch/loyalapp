require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── DB (service key for server-side operations) ──────────────
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── WEB PUSH ─────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:' + process.env.CONTACT_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── DYNAMIC PWA MANIFEST (per merchant) ──────────────────────
app.get('/manifest/:slug.json', async (req, res) => {
  const { data } = await db.from('merchants')
    .select('name,brand_color,slug,logo_text')
    .eq('slug', req.params.slug)
    .maybeSingle();
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: data.name + ' Rewards',
    short_name: data.logo_text || data.name,
    description: 'Collect stamps and earn rewards',
    theme_color: data.brand_color,
    background_color: '#0A0A0A',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/card?m=' + data.slug,
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ]
  });
});

// ── VAPID PUBLIC KEY (for push subscription) ──────────────────
app.get('/api/vapid-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// ── MERCHANT PUBLIC INFO ──────────────────────────────────────
app.get('/api/merchant/:slug', async (req, res) => {
  const { data, error } = await db.from('merchants')
    .select('id,name,slug,brand_color,logo_text,stamps_per_card,reward_name,reward_value,services')
    .eq('slug', req.params.slug)
    .maybeSingle();
  if (!data) return res.status(404).json({ error: 'Merchant not found' });
  res.json(data);
});

// ── MERCHANT BY AUTH ID ───────────────────────────────────────
app.get('/api/merchant/by-auth/:authId', async (req, res) => {
  const { data } = await db.from('merchants')
    .select('*').eq('auth_id', req.params.authId).maybeSingle();
  res.json(data || null);
});

// ── CREATE MERCHANT ───────────────────────────────────────────
app.post('/api/merchant', async (req, res) => {
  const { name, slug, email, authId, brandColor, logoText, stampsPerCard, rewardName, rewardValue, services } = req.body;
  const { data, error } = await db.from('merchants').insert({
    name, slug, email,
    auth_id: authId,
    brand_color: brandColor || '#C9A84C',
    logo_text: logoText || name.substring(0,6).toUpperCase(),
    stamps_per_card: stampsPerCard || 10,
    reward_name: rewardName || 'Free Item',
    reward_value: rewardValue || '',
    services: services || ['Service'],
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  // Create default staff account
  await db.from('staff').insert({ merchant_id: data.id, name: 'Staff', pin: '1234', branch: name });
  res.json(data);
});

// ── UPDATE MERCHANT SETTINGS ──────────────────────────────────
app.patch('/api/merchant/:id', async (req, res) => {
  const { data, error } = await db.from('merchants')
    .update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── MEMBER LOOKUP ─────────────────────────────────────────────
app.get('/api/member', async (req, res) => {
  const { phone, merchantId } = req.query;
  const clean = phone.replace(/\D/g, '');
  let { data } = await db.from('members').select('*')
    .eq('merchant_id', merchantId).eq('phone', phone).maybeSingle();
  if (!data) {
    const r = await db.from('members').select('*')
      .eq('merchant_id', merchantId).ilike('phone', '%' + clean + '%').limit(1);
    data = r.data?.[0] || null;
  }
  res.json(data);
});

// ── REGISTER MEMBER ───────────────────────────────────────────
app.post('/api/member', async (req, res) => {
  const { name, phone, merchantId } = req.body;
  const { data, error } = await db.from('members')
    .insert({ name, phone, merchant_id: merchantId }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Phone already registered' });
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

// ── MEMBER ACTIVITY ───────────────────────────────────────────
app.get('/api/member/:id/activity', async (req, res) => {
  const [stamps, redemptions] = await Promise.all([
    db.from('stamps').select('*').eq('member_id', req.params.id).order('created_at', { ascending: false }),
    db.from('redemptions').select('*').eq('member_id', req.params.id).order('created_at', { ascending: false }),
  ]);
  res.json({ stamps: stamps.data || [], redemptions: redemptions.data || [] });
});

// ── STAFF LOGIN ───────────────────────────────────────────────
app.post('/api/staff/login', async (req, res) => {
  const { merchantId, pin } = req.body;
  const { data } = await db.from('staff')
    .select('*').eq('merchant_id', merchantId).eq('pin', pin).limit(1);
  if (!data?.length) return res.status(401).json({ error: 'Incorrect PIN' });
  res.json(data[0]);
});

// ── SEARCH MEMBERS (staff) ────────────────────────────────────
app.get('/api/members/search', async (req, res) => {
  const { q, merchantId } = req.query;
  if (!q?.trim()) return res.json([]);
  const { data: members } = await db.from('members').select('*')
    .eq('merchant_id', merchantId)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(8);
  if (!members?.length) return res.json([]);

  const ids = members.map(m => m.id);
  const { data: stampRows } = await db.from('stamps').select('member_id').in('member_id', ids);
  const { data: redeemRows } = await db.from('redemptions').select('member_id').in('member_id', ids);
  const sc = {}, rc = {};
  (stampRows || []).forEach(s => sc[s.member_id] = (sc[s.member_id] || 0) + 1);
  (redeemRows || []).forEach(r => rc[r.member_id] = (rc[r.member_id] || 0) + 1);

  res.json(members.map(m => ({ ...m, stampCount: sc[m.id] || 0, redeemCount: rc[m.id] || 0 })));
});

// ── ALL MEMBERS (staff/dashboard) ─────────────────────────────
app.get('/api/members/all', async (req, res) => {
  const { merchantId } = req.query;
  if (!merchantId) return res.status(400).json({ error: 'merchantId required' });
  const { data: members } = await db.from('members').select('*')
    .eq('merchant_id', merchantId).order('created_at', { ascending: false });
  if (!members?.length) return res.json([]);
  const ids = members.map(m => m.id);
  const { data: stampRows } = await db.from('stamps').select('member_id').in('member_id', ids);
  const { data: redeemRows } = await db.from('redemptions').select('member_id').in('member_id', ids);
  const sc = {}, rc = {};
  (stampRows || []).forEach(s => sc[s.member_id] = (sc[s.member_id] || 0) + 1);
  (redeemRows || []).forEach(r => rc[r.member_id] = (rc[r.member_id] || 0) + 1);
  res.json(members.map(m => {
    const stamps = sc[m.id] || 0;
    let tier = 'Bronze';
    if (stamps >= 200) tier = 'Platinum';
    else if (stamps >= 100) tier = 'Gold';
    else if (stamps >= 50) tier = 'Silver';
    return { ...m, stampCount: stamps, redeemCount: rc[m.id] || 0, tier };
  }));
});

// ── ADD STAMP ────────────────────────────────────────────────
app.post('/api/stamp', async (req, res) => {
  const { memberId, merchantId, service, staffPin } = req.body;
  const { data: staffRows } = await db.from('staff')
    .select('*').eq('merchant_id', merchantId).eq('pin', staffPin).limit(1);
  if (!staffRows?.length) return res.status(401).json({ error: 'Invalid PIN' });

  const { data, error } = await db.from('stamps').insert({
    member_id: memberId, merchant_id: merchantId,
    service, branch: staffRows[0].branch, staff_name: staffRows[0].name,
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });

  // Send push notification (non-blocking)
  notifyMember(memberId, '⭐ Stamp collected!', `You visited ${service}. Keep it up!`).catch(() => {});
  res.json(data);
});

// ── REDEEM REWARD ─────────────────────────────────────────────
app.post('/api/redeem', async (req, res) => {
  const { memberId, merchantId, rewardName } = req.body;
  const { data, error } = await db.from('redemptions')
    .insert({ member_id: memberId, merchant_id: merchantId, reward_name: rewardName })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── DASHBOARD STATS ───────────────────────────────────────────
app.get('/api/dashboard/:merchantId', async (req, res) => {
  const mid = req.params.merchantId;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const [totalM, todayS, weekS, weekR, recent] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true }).eq('merchant_id', mid),
    db.from('stamps').select('*', { count: 'exact', head: true }).eq('merchant_id', mid).gte('created_at', today.toISOString()),
    db.from('stamps').select('*', { count: 'exact', head: true }).eq('merchant_id', mid).gte('created_at', weekAgo.toISOString()),
    db.from('redemptions').select('*', { count: 'exact', head: true }).eq('merchant_id', mid).gte('created_at', weekAgo.toISOString()),
    db.from('stamps').select('service,branch,created_at,members(name)').eq('merchant_id', mid).order('created_at', { ascending: false }).limit(10),
  ]);

  res.json({
    members: totalM.count || 0,
    todayStamps: todayS.count || 0,
    weekStamps: weekS.count || 0,
    weekRedemptions: weekR.count || 0,
    recent: recent.data || [],
  });
});

// ── STAFF MANAGEMENT ─────────────────────────────────────────
app.get('/api/staff/:merchantId', async (req, res) => {
  const { data } = await db.from('staff').select('*').eq('merchant_id', req.params.merchantId);
  res.json(data || []);
});

app.post('/api/staff', async (req, res) => {
  const { merchantId, name, pin, branch } = req.body;
  const { data, error } = await db.from('staff').insert({ merchant_id: merchantId, name, pin, branch }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.patch('/api/staff/:id', async (req, res) => {
  const { data, error } = await db.from('staff').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── PUSH SUBSCRIPTION ─────────────────────────────────────────
app.post('/api/push/subscribe', async (req, res) => {
  const { memberId, subscription } = req.body;
  await db.from('push_subscriptions')
    .upsert({ member_id: memberId, subscription }, { onConflict: 'member_id' });
  res.json({ ok: true });
});

// ── BROADCAST PUSH NOTIFICATION ───────────────────────────────
app.post('/api/push/broadcast', async (req, res) => {
  const { merchantId, title, body } = req.body;
  const { data: members } = await db.from('members').select('id').eq('merchant_id', merchantId);
  const ids = (members || []).map(m => m.id);
  if (!ids.length) return res.json({ sent: 0 });

  const { data: subs } = await db.from('push_subscriptions').select('*').in('member_id', ids);
  let sent = 0;
  for (const sub of (subs || [])) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body }));
      sent++;
    } catch (e) {
      if (e.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
  res.json({ sent });
});

// ── PUSH HELPER ───────────────────────────────────────────────
async function notifyMember(memberId, title, body) {
  const { data } = await db.from('push_subscriptions')
    .select('subscription').eq('member_id', memberId).maybeSingle();
  if (!data) return;
  await webpush.sendNotification(data.subscription, JSON.stringify({ title, body }));
}

// ── FALLBACK: serve card.html for PWA routes ──────────────────
app.get('/card', (req, res) => res.sendFile('card.html', { root: 'public' }));
app.get('/staff', (req, res) => res.sendFile('staff.html', { root: 'public' }));
app.get('/dashboard', (req, res) => res.sendFile('dashboard.html', { root: 'public' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LoyalApp running on port ${PORT}`));

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));   // 6mb 以容纳 base64 logo 上传
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
    .select('id,name,slug,brand_color,logo_text,logo_url,stamps_per_card,reward_name,reward_value,services')
    .eq('slug', req.params.slug)
    .maybeSingle();
  if (!data) return res.status(404).json({ error: 'Merchant not found' });
  // 兼容别名: stamp_goal / reward_text
  res.json({ ...data, stamp_goal: data.stamps_per_card,
    reward_text: data.reward_value ? `${data.reward_name} (${data.reward_value})` : data.reward_name });
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
    brand_color: brandColor || '#993C1D',
    logo_text: logoText || name.substring(0,6).toUpperCase(),
    stamps_per_card: stampsPerCard || 10,
    reward_name: rewardName || 'Free Item',
    reward_value: rewardValue || '',
    services: services || ['Service'],
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  // Create default staff account + default branch
  await db.from('staff').insert({ merchant_id: data.id, name: 'Staff', pin: '1234', branch: 'Main Branch' });
  await db.from('branches').insert({ merchant_id: data.id, name: 'Main Branch' });
  res.json(data);
});

// ── UPDATE MERCHANT SETTINGS ──────────────────────────────────
app.patch('/api/merchant/:id', async (req, res) => {
  const { data, error } = await db.from('merchants')
    .update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── UPDATE BRANDING (color + logo_url) by slug ────────────────
app.put('/api/merchant/:slug/branding', async (req, res) => {
  const { brand_color, logo_url } = req.body;
  const patch = {};
  if (brand_color !== undefined) patch.brand_color = brand_color;
  if (logo_url !== undefined) patch.logo_url = logo_url;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
  const { error } = await db.from('merchants').update(patch).eq('slug', req.params.slug);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ── UPLOAD LOGO (base64 → Supabase Storage 'logos' bucket) ────
app.post('/api/merchant/:slug/upload-logo', async (req, res) => {
  try {
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'fileBase64 required' });
    const m = fileBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'invalid image data' });
    const contentType = m[1];
    const ext = (contentType.split('/')[1] || 'png').replace('jpeg', 'jpg').split('+')[0];
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'image too large (max 5MB)' });

    // 确保 'logos' 公开桶存在 (service key 可建; 已存在则忽略错误)
    await db.storage.createBucket('logos', { public: true }).catch(() => {});

    const path = `${req.params.slug}/logo-${Date.now()}.${ext}`;
    const up = await db.storage.from('logos').upload(path, buffer, { contentType, upsert: true });
    if (up.error) return res.status(400).json({ error: 'upload failed: ' + up.error.message });

    const { data: pub } = db.storage.from('logos').getPublicUrl(path);
    const url = pub.publicUrl;
    // 顺手写入 merchants.logo_url
    await db.from('merchants').update({ logo_url: url }).eq('slug', req.params.slug);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// ── MEMBER LOOKUP BY PHONE (path-param alias) ─────────────────
app.get('/api/member/:phone', async (req, res) => {
  const { merchantId } = req.query;
  const phone = req.params.phone;
  const clean = phone.replace(/\D/g, '');
  let { data } = await db.from('members').select('*')
    .eq('merchant_id', merchantId).eq('phone', phone).maybeSingle();
  if (!data) {
    const r = await db.from('members').select('*')
      .eq('merchant_id', merchantId).ilike('phone', '%' + clean + '%').limit(1);
    data = r.data?.[0] || null;
  }
  if (!data) return res.json(null);
  const { count } = await db.from('stamps')
    .select('*', { count: 'exact', head: true }).eq('member_id', data.id);
  res.json({ ...data, total_stamps: count || 0, stamps: count || 0 });
});

// ── REGISTER MEMBER ───────────────────────────────────────────
async function registerMember(req, res) {
  const { name, phone, merchantId } = req.body;
  const { data, error } = await db.from('members')
    .insert({ name, phone, merchant_id: merchantId }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Phone already registered' });
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
}
app.post('/api/member', registerMember);
app.post('/api/member/register', registerMember);   // alias

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
    return { ...m, stampCount: stamps, total_stamps: stamps, redeemCount: rc[m.id] || 0, tier };
  }));
});

// ── ADD STAMP ────────────────────────────────────────────────
app.post('/api/stamp', async (req, res) => {
  const { memberId, merchantId, service, staffPin, branch } = req.body;
  const { data: staffRows } = await db.from('staff')
    .select('*').eq('merchant_id', merchantId).eq('pin', staffPin).limit(1);
  if (!staffRows?.length) return res.status(401).json({ error: 'Invalid PIN' });

  const { data, error } = await db.from('stamps').insert({
    member_id: memberId, merchant_id: merchantId,
    service, branch: branch || staffRows[0].branch, staff_name: staffRows[0].name,
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
  const sent = await broadcastToMembers(merchantId, title, body);
  res.json({ sent });
});

// ── SCHEDULE A PUSH (定时发送) ─────────────────────────────────
app.post('/api/push/schedule', async (req, res) => {
  const { merchantId, title, body, scheduledAt } = req.body;
  if (!merchantId || !title || !body || !scheduledAt)
    return res.status(400).json({ error: 'merchantId, title, body, scheduledAt required' });
  const { data, error } = await db.from('scheduled_pushes')
    .insert({ merchant_id: merchantId, title, body, scheduled_at: scheduledAt })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── LIST SCHEDULED PUSHES ─────────────────────────────────────
app.get('/api/push/scheduled/:merchantId', async (req, res) => {
  const { data } = await db.from('scheduled_pushes')
    .select('*').eq('merchant_id', req.params.merchantId)
    .order('scheduled_at', { ascending: false }).limit(50);
  res.json(data || []);
});

// ── CANCEL A SCHEDULED PUSH ───────────────────────────────────
app.delete('/api/push/scheduled/:id', async (req, res) => {
  const { error } = await db.from('scheduled_pushes')
    .update({ status: 'cancelled' }).eq('id', req.params.id).eq('status', 'pending');
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ── AUTO WIN-BACK (一键挽留 N 天未到店的会员) ──────────────────
app.post('/api/push/winback', async (req, res) => {
  const { merchantId, days = 14, title, body } = req.body;
  if (!merchantId) return res.status(400).json({ error: 'merchantId required' });
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: members } = await db.from('members').select('id').eq('merchant_id', merchantId);
  const allIds = (members || []).map(m => m.id);
  if (!allIds.length) return res.json({ sent: 0, targeted: 0 });

  // 找出 cutoff 之后仍有到店(印章)的会员 → 这些是“活跃”的,排除掉
  const { data: recentStamps } = await db.from('stamps')
    .select('member_id').eq('merchant_id', merchantId).gte('created_at', cutoff);
  const active = new Set((recentStamps || []).map(s => s.member_id));
  const lapsedIds = allIds.filter(id => !active.has(id));
  if (!lapsedIds.length) return res.json({ sent: 0, targeted: 0 });

  const t = title || 'We miss you! 💛';
  const b = body || `It's been a while — come back and earn rewards!`;
  const sent = await broadcastToMembers(merchantId, t, b, lapsedIds);
  res.json({ sent, targeted: lapsedIds.length });
});

// ── PUSH HELPERS ──────────────────────────────────────────────
async function notifyMember(memberId, title, body) {
  const { data } = await db.from('push_subscriptions')
    .select('subscription').eq('member_id', memberId).maybeSingle();
  if (!data) return;
  await webpush.sendNotification(data.subscription, JSON.stringify({ title, body }));
}

// 向某商户的会员广播 (可选 memberIds 限定子集); 返回成功发送数
async function broadcastToMembers(merchantId, title, body, memberIds) {
  let ids = memberIds;
  if (!ids) {
    const { data: members } = await db.from('members').select('id').eq('merchant_id', merchantId);
    ids = (members || []).map(m => m.id);
  }
  if (!ids.length) return 0;

  const { data: subs } = await db.from('push_subscriptions').select('*').in('member_id', ids);
  let sent = 0;
  for (const sub of (subs || [])) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body }));
      sent++;
    } catch (e) {
      if (e.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
  return sent;
}

// ── SCHEDULER: 每 60s 检查到期的定时推送并发送 ─────────────────
async function processScheduledPushes() {
  try {
    const nowIso = new Date().toISOString();
    const { data: due } = await db.from('scheduled_pushes')
      .select('*').eq('status', 'pending').lte('scheduled_at', nowIso).limit(20);
    for (const job of (due || [])) {
      try {
        const sent = await broadcastToMembers(job.merchant_id, job.title, job.body);
        await db.from('scheduled_pushes')
          .update({ status: 'sent', sent_count: sent, sent_at: new Date().toISOString() })
          .eq('id', job.id);
        console.log(`[scheduler] sent push "${job.title}" to ${sent} members`);
      } catch (e) {
        await db.from('scheduled_pushes').update({ status: 'failed' }).eq('id', job.id);
        console.error('[scheduler] job failed', job.id, e.message);
      }
    }
  } catch (e) {
    console.error('[scheduler] tick error', e.message);
  }
}
setInterval(processScheduledPushes, 60 * 1000);

// ── BRANCHES (多门店管理) ─────────────────────────────────────
app.get('/api/branches/:merchantId', async (req, res) => {
  const { data } = await db.from('branches')
    .select('*').eq('merchant_id', req.params.merchantId)
    .order('created_at', { ascending: true });
  res.json(data || []);
});

app.post('/api/branches', async (req, res) => {
  const { merchantId, name } = req.body;
  if (!merchantId || !name?.trim()) return res.status(400).json({ error: 'merchantId and name required' });
  const { data, error } = await db.from('branches')
    .insert({ merchant_id: merchantId, name: name.trim() }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Branch already exists' });
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

app.delete('/api/branches/:id', async (req, res) => {
  const { error } = await db.from('branches').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ── ADVANCED ANALYTICS ────────────────────────────────────────
app.get('/api/analytics/:merchantId', async (req, res) => {
  const mid = req.params.merchantId;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const branch = req.query.branch && req.query.branch !== 'all' ? req.query.branch : null;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));
  const sinceIso = since.toISOString();

  let stampQ = db.from('stamps').select('member_id,service,branch,created_at')
    .eq('merchant_id', mid).gte('created_at', sinceIso);
  if (branch) stampQ = stampQ.eq('branch', branch);

  const [stampsR, membersR, redeemR, allStampsR] = await Promise.all([
    stampQ,
    db.from('members').select('id,created_at').eq('merchant_id', mid),
    db.from('redemptions').select('created_at').eq('merchant_id', mid).gte('created_at', sinceIso),
    db.from('stamps').select('member_id').eq('merchant_id', mid),  // 全量, 用于 tier/复购
  ]);
  const stamps = stampsR.data || [], members = membersR.data || [],
        redemptions = redeemR.data || [], allStamps = allStampsR.data || [];

  // 生成过去 N 天的日期骨架
  const dayKey = d => new Date(d).toISOString().slice(0, 10);
  const skeleton = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setDate(d.getDate() + i);
    skeleton[d.toISOString().slice(0, 10)] = 0;
  }
  const dailyStamps = { ...skeleton }, dailyMembers = { ...skeleton };
  stamps.forEach(s => { const k = dayKey(s.created_at); if (k in dailyStamps) dailyStamps[k]++; });
  members.forEach(m => { const k = dayKey(m.created_at); if (k in dailyMembers) dailyMembers[k]++; });

  // 按服务 / 门店分布
  const svc = {}, br = {};
  stamps.forEach(s => { svc[s.service] = (svc[s.service] || 0) + 1; br[s.branch] = (br[s.branch] || 0) + 1; });

  // 等级分布 + 复购率 (基于全量印章)
  const perMember = {};
  allStamps.forEach(s => perMember[s.member_id] = (perMember[s.member_id] || 0) + 1);
  const tierCount = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
  members.forEach(m => {
    const c = perMember[m.id] || 0;
    let t = 'Bronze';
    if (c >= 200) t = 'Platinum'; else if (c >= 100) t = 'Gold'; else if (c >= 50) t = 'Silver';
    tierCount[t]++;
  });
  const repeatMembers = Object.values(perMember).filter(c => c > 1).length;
  const repeatRate = members.length ? Math.round(repeatMembers / members.length * 100) : 0;

  const toSeries = obj => Object.keys(obj).sort().map(k => ({ date: k, count: obj[k] }));
  const toPairs  = obj => Object.entries(obj).map(([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count);

  res.json({
    days,
    totalStamps: stamps.length,
    totalMembers: members.length,
    totalRedemptions: redemptions.length,
    repeatRate,
    dailyStamps: toSeries(dailyStamps),
    dailyMembers: toSeries(dailyMembers),
    serviceBreakdown: toPairs(svc),
    branchBreakdown: toPairs(br),
    tierBreakdown: tierCount,
  });
});

// ── FALLBACK: serve card.html for PWA routes ──────────────────
app.get('/card', (req, res) => res.sendFile('card.html', { root: 'public' }));
app.get('/staff', (req, res) => res.sendFile('staff.html', { root: 'public' }));
app.get('/dashboard', (req, res) => res.sendFile('dashboard.html', { root: 'public' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LoyalApp running on port ${PORT}`));

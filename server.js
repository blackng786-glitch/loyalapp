require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const bcrypt  = require('bcryptjs');
const webpush = require('web-push');
const crypto  = require('crypto');
const Stripe  = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const SMS_FREE_QUOTA = parseInt(process.env.SMS_FREE_QUOTA) || 50;

const app = express();
app.set('trust proxy', 1);                 // Railway 反代后取真实客户端 IP (限流用)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: ALLOWED_ORIGINS.length
    ? (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin))
    : (origin, cb) => cb(null, !origin || origin === `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || /^https?:\/\/localhost(:\d+)?$/.test(origin || '')),
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: false,            // 前端 inline script 需要; XSS 由 esc() 手动防
  crossOriginEmbedderPolicy: false,        // 允许外部 CDN 资源加载
}));
// Stripe webhook needs raw body — must be before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json({ limit: '6mb' }));   // 6mb 以容纳 base64 logo 上传
app.get('/bottle', (req, res) => { res.redirect(301, '/card' + (req.query.m ? '?m=' + encodeURIComponent(req.query.m) : '')); });
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await db.from('merchants').select('id').limit(1);
    res.json({ db: error ? 'error' : 'ok', count: data?.length ?? 0 });
  } catch (e) { console.error('[health]', e.message); res.status(500).json({ db: 'crash' }); }
});
app.use(express.static('public'));

// ── DB (service key for server-side operations) ──────────────
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
// Separate client for OTP auth — verifyOtp() stores a user session internally,
// which would override service_role on the main db client and break RLS bypass.
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── INPUT VALIDATION ────────────────────────────────────────
const LIMITS = { name: 100, phone: 20, slug: 50, color: 10, logoText: 20, reward: 100, service: 50, pin: 20, branch: 100, title: 200, body: 1000, brand: 100, label: 100, email: 254 };
function checkLen(fields) {
  for (const [val, max, label] of fields) {
    if (val && typeof val === 'string' && val.length > max) return `${label} 不能超过 ${max} 字符`;
  }
  return null;
}

// ── AUTH HELPERS ─────────────────────────────────────────────
// HMAC 签名 token (会员登录态 / 注册票据)。密钥优先用环境变量, 否则从 service key 派生。
const TOKEN_SECRET = process.env.MEMBER_TOKEN_SECRET ||
  crypto.createHash('sha256').update('choppkar-member:' + (process.env.SUPABASE_SERVICE_KEY || '')).digest('hex');
if (!process.env.MEMBER_TOKEN_SECRET) console.warn('[WARN] MEMBER_TOKEN_SECRET not set — using derived fallback. Set a random 64-char hex string in production.');

function safeDbError(err) {
  if (err.code === '23505') return '记录已存在';
  if (err.code === '23503') return '关联数据不存在';
  if (err.code === '42501') return '权限不足';
  console.error('[DB]', err.code, err.message);
  return '操作失败，请重试';
}

const hmac = p => crypto.createHmac('sha256', TOKEN_SECRET).update(p).digest('base64url');
function signToken(parts, ttlMs) {
  const p64 = Buffer.from(JSON.stringify({ ...parts, exp: Date.now() + ttlMs })).toString('base64url');
  return p64 + '.' + hmac(p64);
}
function verifyToken(token) {
  try {
    const [p64, sig] = String(token || '').split('.');
    if (!p64 || !sig) return null;
    const expect = hmac(p64);
    if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const data = JSON.parse(Buffer.from(p64, 'base64url').toString());
    return Date.now() > data.exp ? null : data;
  } catch (e) { return null; }
}
const memberToken = (memberId, merchantId) => signToken({ t: 'member', memberId, merchantId }, 30 * 86400000); // 30 天
const regTicketFor = (phone, merchantId) => signToken({ t: 'reg', phone, merchantId }, 15 * 60000);            // 15 分钟

// 从请求头取已验证的会员身份 (x-member-token)
function getMember(req) {
  const d = verifyToken(req.headers['x-member-token']);
  return d && d.t === 'member' ? d : null;
}

// Supabase JWT → user (dashboard 商家登录态)
async function getAuthUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const { data, error } = await db.auth.getUser(h.slice(7));
    return error ? null : data.user;
  } catch (e) { return null; }
}

// 商家鉴权: JWT 用户必须拥有该 merchant。失败时已回复响应, 返回 null。
async function requireMerchant(req, res, merchantId) {
  const user = await getAuthUser(req);
  if (!user) { res.status(401).json({ error: '请先登录' }); return null; }
  if (!merchantId) { res.status(400).json({ error: 'merchantId required' }); return null; }
  const { data: m } = await db.from('merchants').select('id,auth_id,slug').eq('id', merchantId).maybeSingle();
  if (!m || m.auth_id !== user.id) { res.status(403).json({ error: '无权限' }); return null; }
  return m;
}
async function requireMerchantBySlug(req, res, slug) {
  const { data: m } = await db.from('merchants').select('id,auth_id,slug').eq('slug', slug).maybeSingle();
  if (!m) { res.status(404).json({ error: 'Merchant not found' }); return null; }
  const user = await getAuthUser(req);
  if (!user || m.auth_id !== user.id) { res.status(401).json({ error: '未授权' }); return null; }
  return m;
}

// 员工鉴权: x-staff-pin 头 (或 body.staffPin) + merchantId
async function getStaff(req, merchantId) {
  const pin = req.headers['x-staff-pin'] || req.body?.staffPin;
  if (!pin || !merchantId) return null;
  const { data } = await db.from('staff').select('*').eq('merchant_id', merchantId);
  return matchStaffPin(data, pin);
}
async function matchStaffPin(staffRows, pin) {
  for (const s of (staffRows || [])) {
    if (s.pin.startsWith('$2')) { if (await bcrypt.compare(pin, s.pin)) return s; }
    else if (s.pin === pin) {
      await db.from('staff').update({ pin: await bcrypt.hash(pin, 10) }).eq('id', s.id);
      return s;
    }
  }
  return null;
}

// 员工或商家任一即可 (staff.html 与 dashboard.html 共用的端点)
async function requireStaffOrMerchant(req, res, merchantId) {
  if (!merchantId) { res.status(400).json({ error: 'merchantId required' }); return null; }
  const staff = await getStaff(req, merchantId);
  if (staff) return { staff };
  const user = await getAuthUser(req);
  if (user) {
    const { data: m } = await db.from('merchants').select('id,auth_id').eq('id', merchantId).maybeSingle();
    if (m && m.auth_id === user.id) return { merchant: m };
  }
  res.status(401).json({ error: '未授权' });
  return null;
}

// ── RATE LIMIT (内存滑动窗口, 单实例部署够用) ──────────────────
const rlMap = new Map();
function rateOk(key, windowMs, max) {
  const now = Date.now();
  let arr = rlMap.get(key) || [];
  arr = arr.filter(t => now - t < windowMs);
  if (arr.length >= max) { rlMap.set(key, arr); return false; }
  arr.push(now); rlMap.set(key, arr);
  return true;
}
setInterval(() => {  // 每小时清理过期 key, 防内存增长
  const now = Date.now();
  for (const [k, arr] of rlMap) {
    const live = arr.filter(t => now - t < 86400000);
    if (live.length) rlMap.set(k, live); else rlMap.delete(k);
  }
}, 3600000);

// ── SECURITY EVENT LOGGING ──────────────────────────────────
function logSec(type, severity, ip, merchantId, details) {
  db.from('security_events').insert({
    event_type: type, severity, ip: ip || null,
    merchant_id: merchantId || null, details: details || {},
  }).then(() => {}).catch(e => console.error('[sec-log]', e.message));
  if (severity === 'critical') console.warn(`[SEC-CRITICAL] ${type} ip=${ip}`, JSON.stringify(details));
}

// ── IP AUTO-BAN (内存, 重启清零) ────────────────────────────
const banMap = new Map();
const BAN_THRESHOLD_1 = 10;   // 10 次违规 → 封 1 小时
const BAN_THRESHOLD_2 = 30;   // 30 次 → 封 24 小时
const ipStrikes = new Map();

function recordStrike(ip) {
  const n = (ipStrikes.get(ip) || 0) + 1;
  ipStrikes.set(ip, n);
  if (n >= BAN_THRESHOLD_2) {
    banMap.set(ip, Date.now() + 24 * 3600000);
    logSec('ip_ban', 'critical', ip, null, { strikes: n, duration: '24h' });
  } else if (n >= BAN_THRESHOLD_1) {
    banMap.set(ip, Date.now() + 3600000);
    logSec('ip_ban', 'warn', ip, null, { strikes: n, duration: '1h' });
  }
}

function isBanned(ip) {
  const until = banMap.get(ip);
  if (!until) return false;
  if (Date.now() > until) { banMap.delete(ip); ipStrikes.delete(ip); return false; }
  return true;
}

app.use((req, res, next) => {
  if (isBanned(req.ip)) return res.status(403).json({ error: '访问已被限制' });
  next();
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, until] of banMap) if (now > until) { banMap.delete(ip); ipStrikes.delete(ip); }
}, 600000);

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
  // select('*') 对缺失列容错(bg_color/feature_* 迁移可能未跑), 输出仅白名单字段(不泄露 email/auth_id)
  const { data } = await db.from('merchants').select('*').eq('slug', req.params.slug).maybeSingle();
  if (!data) return res.status(404).json({ error: 'Merchant not found' });
  res.json({
    id: data.id, name: data.name, slug: data.slug,
    brand_color: data.brand_color, bg_color: data.bg_color || null,
    logo_text: data.logo_text, logo_url: data.logo_url || null,
    stamps_per_card: data.stamps_per_card, reward_name: data.reward_name, reward_value: data.reward_value,
    services: data.services,
    feature_stamp: data.feature_stamp !== false,      // 默认开
    feature_bottle: !!data.feature_bottle,            // 默认关
    feature_voucher: !!data.feature_voucher,          // 默认关
    stamp_goal: data.stamps_per_card,
    reward_text: data.reward_value ? `${data.reward_name} (${data.reward_value})` : data.reward_name,
  });
});

// ── MERCHANT BY AUTH ID ───────────────────────────────────────
app.get('/api/merchant/by-auth/:authId', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.id !== req.params.authId) return res.status(401).json({ error: '未授权' });
  const { data } = await db.from('merchants')
    .select('*').eq('auth_id', req.params.authId).maybeSingle();
  res.json(data || null);
});

// ── CREATE MERCHANT ───────────────────────────────────────────
app.post('/api/merchant', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: '请先登录' });
  const { name, slug, email, brandColor, logoText, stampsPerCard, rewardName, rewardValue, services } = req.body;
  const lenErr = checkLen([[name, LIMITS.name, '商家名'], [slug, LIMITS.slug, 'Slug'], [email, LIMITS.email, 'Email'], [logoText, LIMITS.logoText, 'Logo'], [rewardName, LIMITS.reward, '奖励名'], [rewardValue, LIMITS.reward, '奖励值']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const { data, error } = await db.from('merchants').insert({
    name, slug,
    email: user.email || email,
    auth_id: user.id,                        // 取自 JWT, 不信任 body
    brand_color: brandColor || '#993C1D',
    logo_text: logoText || name.substring(0,6).toUpperCase(),
    stamps_per_card: stampsPerCard || 10,
    reward_name: rewardName || 'Free Item',
    reward_value: rewardValue || '',
    services: services || ['Service'],
  }).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  const defaultPin = String(Math.floor(100000 + Math.random() * 900000));
  await db.from('staff').insert({ merchant_id: data.id, name: 'Staff', pin: await bcrypt.hash(defaultPin, 10), branch: 'Main Branch' });
  await db.from('branches').insert({ merchant_id: data.id, name: 'Main Branch' });
  res.json({ ...data, defaultStaffPin: defaultPin });
});

// ── SLUG AVAILABILITY CHECK ──────────────────────────────────
app.get('/api/slug-check/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (slug.length < 2) return res.json({ available: false, reason: 'too_short' });
  const { data } = await db.from('merchants').select('id').eq('slug', slug).maybeSingle();
  res.json({ available: !data, slug });
});

// ── UPDATE MERCHANT SETTINGS ──────────────────────────────────
app.patch('/api/merchant/:id', async (req, res) => {
  const m = await requireMerchant(req, res, req.params.id);
  if (!m) return;
  // 字段白名单, 防止改 auth_id / plan / email
  const ALLOWED = ['name', 'brand_color', 'bg_color', 'logo_text', 'logo_url', 'stamps_per_card', 'reward_name', 'reward_value', 'services'];
  const patch = {};
  for (const k of ALLOWED) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
  const { data, error } = await db.from('merchants')
    .update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json(data);
});

// ── UPDATE BRANDING (color + logo_url) by slug ────────────────
app.put('/api/merchant/:slug/branding', async (req, res) => {
  const m = await requireMerchantBySlug(req, res, req.params.slug);
  if (!m) return;
  const { brand_color, logo_url, bg_color } = req.body;
  const patch = {};
  if (brand_color !== undefined) patch.brand_color = brand_color;
  if (logo_url !== undefined) patch.logo_url = logo_url;
  if (bg_color !== undefined) patch.bg_color = bg_color;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
  const { error } = await db.from('merchants').update(patch).eq('slug', req.params.slug);
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json({ success: true });
});

// ── UPLOAD LOGO (base64 → Supabase Storage 'logos' bucket) ────
app.post('/api/merchant/:slug/upload-logo', async (req, res) => {
  try {
    const owner = await requireMerchantBySlug(req, res, req.params.slug);
    if (!owner) return;
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
    console.error('[upload]', e.message);
    res.status(500).json({ error: '上传失败' });
  }
});

// ── CUSTOMER OTP AUTH (Supabase Phone OTP) ───────────────────
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone, merchantId: otpMerchantId } = req.body;
  if (!phone || phone.length < 8) return res.status(400).json({ error: '请输入有效手机号' });
  // SMS quota check (per merchant)
  if (otpMerchantId) {
    const quota = await checkSmsQuota(otpMerchantId);
    if (!quota.allowed) return res.status(402).json({ error: `SMS quota exceeded (${quota.used}/${quota.limit} this month). Upgrade to Pro for unlimited.`, code: 'SMS_QUOTA' });
  }
  // 限流: 防短信轰炸 + 控制 SMS 成本
  if (!rateOk('otp:p1:' + phone, 60 * 1000, 1))        { recordStrike(req.ip); logSec('rate_limit', 'warn', req.ip, null, { type: 'otp_send', phone }); return res.status(429).json({ error: '发送太频繁，请 1 分钟后再试' }); }
  if (!rateOk('otp:pd:' + phone, 24 * 3600 * 1000, 8)) { recordStrike(req.ip); logSec('rate_limit', 'warn', req.ip, null, { type: 'otp_daily', phone }); return res.status(429).json({ error: '该号码今日发送次数已达上限' }); }
  if (!rateOk('otp:ip:' + req.ip, 3600 * 1000, 15))    { recordStrike(req.ip); logSec('rate_limit', 'critical', req.ip, null, { type: 'otp_ip_flood' }); return res.status(429).json({ error: '请求过于频繁，请稍后再试' }); }
  try {
    const { error } = await authClient.auth.signInWithOtp({ phone });
    if (error) return res.status(400).json({ error: error.message });
    if (otpMerchantId) incrementSmsCount(otpMerchantId).catch(e => console.error('[sms-count]', e.message));
    res.json({ success: true });
  } catch (e) {
    console.error('[send-otp]', e.message);
    res.status(500).json({ error: '服务异常，请稍后再试' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, token, merchantId } = req.body;
  if (!phone || !token) return res.status(400).json({ error: 'phone and token required' });
  // 限流: 6 位验证码防暴力穷举
  if (!rateOk('otp:vf:' + phone, 3600 * 1000, 10)) { recordStrike(req.ip); logSec('rate_limit', 'critical', req.ip, null, { type: 'otp_verify_brute', phone }); return res.status(429).json({ error: '尝试次数过多，请稍后再试' }); }
  try {
    const { error } = await authClient.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) { logSec('otp_fail', 'info', req.ip, null, { phone }); return res.status(400).json({ error: error.message }); }

    // 查 members 表找这个 phone 的会员
    let member = null, total_stamps = 0;
    if (merchantId) {
      // 精确匹配
      const { data: m } = await db.from('members').select('*')
        .eq('merchant_id', merchantId).eq('phone', phone).maybeSingle();
      if (!m) {
        // 模糊匹配: 去掉国际码最后9位
        const tail = phone.replace(/\D/g, '').slice(-9);
        const { data: rows } = await db.from('members').select('*')
          .eq('merchant_id', merchantId).ilike('phone', '%' + tail).limit(1);
        member = rows?.[0] || null;
      } else {
        member = m;
      }
      if (member) {
        const { count } = await db.from('stamps')
          .select('*', { count: 'exact', head: true }).eq('member_id', member.id);
        total_stamps = count || 0;
      }
    }
    // OTP 通过 → 签发凭证: 老会员发 30 天登录 token, 新会员发 15 分钟注册票据
    res.json({
      success: true, isNew: !member,
      member: member ? { ...member, total_stamps } : null,
      token: member ? memberToken(member.id, merchantId) : null,
      regTicket: member ? null : regTicketFor(phone, merchantId || ''),
    });
  } catch (e) {
    console.error('[verify-otp]', e.message);
    res.status(500).json({ error: '验证服务异常' });
  }
});

// ── MEMBER LOOKUP (员工/商家用; 手机号反查会泄露隐私, 不再公开) ──
app.get('/api/member', async (req, res) => {
  const { phone, merchantId } = req.query;
  const auth = await requireStaffOrMerchant(req, res, merchantId);
  if (!auth) return;
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
  const auth = await requireStaffOrMerchant(req, res, merchantId);
  if (!auth) return;
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

// ── REGISTER MEMBER (必须持有 OTP 验证后签发的注册票据) ─────────
async function registerMember(req, res) {
  const { name, phone, merchantId, regTicket } = req.body;
  const lenErr = checkLen([[name, LIMITS.name, '姓名'], [phone, LIMITS.phone, '手机号']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const ticket = verifyToken(regTicket);
  if (!ticket || ticket.t !== 'reg' || ticket.phone !== phone || (ticket.merchantId && ticket.merchantId !== merchantId))
    return res.status(401).json({ error: '请先完成手机验证' });
  const { data, error } = await db.from('members')
    .insert({ name, phone, merchant_id: merchantId }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Phone already registered' });
    return res.status(400).json({ error: safeDbError(error) });
  }
  res.json({ ...data, token: memberToken(data.id, merchantId) });
}
app.post('/api/member', registerMember);
app.post('/api/member/register', registerMember);   // alias

// ── MEMBER ACTIVITY (本人 token 才能看) ───────────────────────
app.get('/api/member/:id/activity', async (req, res) => {
  const mt = getMember(req);
  if (!mt || mt.memberId !== req.params.id) return res.status(401).json({ error: '未授权' });
  const [stamps, redemptions] = await Promise.all([
    db.from('stamps').select('*').eq('member_id', req.params.id).order('created_at', { ascending: false }),
    db.from('redemptions').select('*').eq('member_id', req.params.id).order('created_at', { ascending: false }),
  ]);
  res.json({ stamps: stamps.data || [], redemptions: redemptions.data || [] });
});

// ── STAFF LOGIN ───────────────────────────────────────────────
app.post('/api/staff/login', async (req, res) => {
  const { merchantId, pin } = req.body;
  if (!rateOk('pin:' + req.ip + ':' + merchantId, 3600 * 1000, 10)) {
    recordStrike(req.ip); logSec('rate_limit', 'critical', req.ip, merchantId, { type: 'pin_brute' });
    return res.status(429).json({ error: '尝试次数过多，请 1 小时后再试' });
  }
  const { data } = await db.from('staff').select('*').eq('merchant_id', merchantId);
  const staff = await matchStaffPin(data, pin);
  if (!staff) { logSec('auth_fail', 'warn', req.ip, merchantId, { type: 'staff_pin' }); recordStrike(req.ip); return res.status(401).json({ error: 'Incorrect PIN' }); }
  const { pin: _, ...safe } = staff;
  res.json(safe);
});

// ── SEARCH MEMBERS (staff) ────────────────────────────────────
app.get('/api/members/search', async (req, res) => {
  const { q, merchantId } = req.query;
  const auth = await requireStaffOrMerchant(req, res, merchantId);
  if (!auth) return;
  if (!q?.trim()) return res.json([]);
  const safe = q.replace(/[^a-zA-Z0-9\s一-鿿@+\-]/g, '').trim().slice(0, 50);
  if (!safe) return res.json([]);
  const { data: members } = await db.from('members').select('*')
    .eq('merchant_id', merchantId)
    .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`)
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

// ── ALL MEMBERS (staff/dashboard, paginated) ─────────────────
app.get('/api/members/all', async (req, res) => {
  const { merchantId, page: pg, limit: lim } = req.query;
  const auth = await requireStaffOrMerchant(req, res, merchantId);
  if (!auth) return;
  const page = Math.max(1, parseInt(pg) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(lim) || 50));
  const from = (page - 1) * limit;
  const { data: members, count: totalCount } = await db.from('members')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchantId).order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (!members?.length) return res.json({ members: [], total: totalCount || 0, page, limit });
  const ids = members.map(m => m.id);
  const [{ data: stampRows }, { data: redeemRows }] = await Promise.all([
    db.from('stamps').select('member_id').in('member_id', ids),
    db.from('redemptions').select('member_id').in('member_id', ids),
  ]);
  const sc = {}, rc = {};
  (stampRows || []).forEach(s => sc[s.member_id] = (sc[s.member_id] || 0) + 1);
  (redeemRows || []).forEach(r => rc[r.member_id] = (rc[r.member_id] || 0) + 1);
  res.json({
    members: members.map(m => {
      const stamps = sc[m.id] || 0;
      let tier = 'Bronze';
      if (stamps >= 200) tier = 'Platinum'; else if (stamps >= 100) tier = 'Gold'; else if (stamps >= 50) tier = 'Silver';
      return { ...m, stampCount: stamps, total_stamps: stamps, redeemCount: rc[m.id] || 0, tier };
    }),
    total: totalCount || 0, page, limit,
  });
});

// ── ADD STAMP ────────────────────────────────────────────────
app.post('/api/stamp', async (req, res) => {
  const { memberId, merchantId, service, staffPin, branch } = req.body;
  const lenErr = checkLen([[service, LIMITS.service, '服务'], [branch, LIMITS.branch, '分店']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const { data: allStaff } = await db.from('staff').select('*').eq('merchant_id', merchantId);
  const staff = await matchStaffPin(allStaff, staffPin);
  if (!staff) return res.status(401).json({ error: 'Invalid PIN' });

  const { data, error } = await db.from('stamps').insert({
    member_id: memberId, merchant_id: merchantId,
    service, branch: branch || staff.branch, staff_name: staff.name,
  }).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });

  // Send push notification (non-blocking)
  notifyMember(memberId, '⭐ Stamp collected!', `You visited ${service}. Keep it up!`).catch(() => {});
  res.json(data);
});

// ── REDEEM REWARD (会员本人 token) ────────────────────────────
app.post('/api/redeem', async (req, res) => {
  const { memberId, merchantId, rewardName } = req.body;
  const mt = getMember(req);
  if (!mt || mt.memberId !== memberId) return res.status(401).json({ error: '未授权' });
  const [merchantR, stampsR, redeemedR] = await Promise.all([
    db.from('merchants').select('stamps_per_card').eq('id', merchantId).maybeSingle(),
    db.from('stamps').select('*', { count: 'exact', head: true }).eq('member_id', memberId).eq('merchant_id', merchantId),
    db.from('redemptions').select('*', { count: 'exact', head: true }).eq('member_id', memberId).eq('merchant_id', merchantId),
  ]);
  const goal = merchantR.data?.stamps_per_card || 10;
  const totalStamps = stampsR.count || 0;
  const totalRedeemed = redeemedR.count || 0;
  const available = totalStamps - (totalRedeemed * goal);
  if (available < goal) return res.status(400).json({ error: '印章不足，无法兑换' });
  const { data, error } = await db.from('redemptions')
    .insert({ member_id: memberId, merchant_id: merchantId, reward_name: rewardName })
    .select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json(data);
});

// ── DASHBOARD STATS ───────────────────────────────────────────
app.get('/api/dashboard/:merchantId', async (req, res) => {
  const mid = req.params.merchantId;
  const auth = await requireStaffOrMerchant(req, res, mid);
  if (!auth) return;
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

// ── STAFF MANAGEMENT (商家后台专用) ──────────────────────────
app.get('/api/staff/:merchantId', async (req, res) => {
  const m = await requireMerchant(req, res, req.params.merchantId);
  if (!m) return;
  const { data } = await db.from('staff').select('*').eq('merchant_id', req.params.merchantId);
  res.json(data || []);
});

app.post('/api/staff', async (req, res) => {
  const { merchantId, name, pin, branch } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  const lenErr = checkLen([[name, LIMITS.name, '姓名'], [pin, LIMITS.pin, 'PIN'], [branch, LIMITS.branch, '分店']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const hashed = await bcrypt.hash(pin, 10);
  const { data, error } = await db.from('staff').insert({ merchant_id: merchantId, name, pin: hashed, branch }).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json(data);
});

app.patch('/api/staff/:id', async (req, res) => {
  const { data: st } = await db.from('staff').select('id,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!st) return res.status(404).json({ error: 'staff not found' });
  const m = await requireMerchant(req, res, st.merchant_id);
  if (!m) return;
  const patch = {};
  for (const k of ['name', 'pin', 'branch']) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
  if (patch.pin) {
    if (patch.pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    patch.pin = await bcrypt.hash(patch.pin, 10);
  }
  const { data, error } = await db.from('staff').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json(data);
});

// ── PUSH SUBSCRIPTION (会员本人 token) ────────────────────────
app.post('/api/push/subscribe', async (req, res) => {
  const { memberId, subscription } = req.body;
  const mt = getMember(req);
  if (!mt || mt.memberId !== memberId) return res.status(401).json({ error: '未授权' });
  await db.from('push_subscriptions')
    .upsert({ member_id: memberId, subscription }, { onConflict: 'member_id' });
  res.json({ ok: true });
});

// ── BROADCAST PUSH NOTIFICATION (商家) ────────────────────────
app.post('/api/push/broadcast', async (req, res) => {
  const { merchantId, title, body } = req.body;
  const lenErr = checkLen([[title, LIMITS.title, '标题'], [body, LIMITS.body, '内容']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const sent = await broadcastToMembers(merchantId, title, body);
  res.json({ sent });
});

// ── SCHEDULE A PUSH (定时发送, 商家) ──────────────────────────
app.post('/api/push/schedule', async (req, res) => {
  const { merchantId, title, body, scheduledAt } = req.body;
  if (!merchantId || !title || !body || !scheduledAt)
    return res.status(400).json({ error: 'merchantId, title, body, scheduledAt required' });
  const lenErr = checkLen([[title, LIMITS.title, '标题'], [body, LIMITS.body, '内容']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const { data, error } = await db.from('scheduled_pushes')
    .insert({ merchant_id: merchantId, title, body, scheduled_at: scheduledAt })
    .select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json(data);
});

// ── LIST SCHEDULED PUSHES (商家) ──────────────────────────────
app.get('/api/push/scheduled/:merchantId', async (req, res) => {
  const m = await requireMerchant(req, res, req.params.merchantId);
  if (!m) return;
  const { data } = await db.from('scheduled_pushes')
    .select('*').eq('merchant_id', req.params.merchantId)
    .order('scheduled_at', { ascending: false }).limit(50);
  res.json(data || []);
});

// ── CANCEL A SCHEDULED PUSH (商家) ────────────────────────────
app.delete('/api/push/scheduled/:id', async (req, res) => {
  const { data: job } = await db.from('scheduled_pushes').select('id,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!job) return res.status(404).json({ error: 'not found' });
  const m = await requireMerchant(req, res, job.merchant_id);
  if (!m) return;
  const { error } = await db.from('scheduled_pushes')
    .update({ status: 'cancelled' }).eq('id', req.params.id).eq('status', 'pending');
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json({ ok: true });
});

// ── AUTO WIN-BACK (一键挽留 N 天未到店的会员, 商家) ────────────
app.post('/api/push/winback', async (req, res) => {
  const { merchantId, days = 14, title, body } = req.body;
  if (!merchantId) return res.status(400).json({ error: 'merchantId required' });
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
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
  if (!subs?.length) return 0;
  const payload = JSON.stringify({ title, body });
  const BATCH = 50;
  let sent = 0;
  const stale = [];
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(sub => webpush.sendNotification(sub.subscription, payload))
    );
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') sent++;
      else if (r.reason?.statusCode === 410) stale.push(batch[idx].id);
    });
  }
  if (stale.length) db.from('push_subscriptions').delete().in('id', stale).then(() => {}).catch(() => {});
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

// ── SMS QUOTA ───────────────────────────────────────────────────
function smsMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

async function checkSmsQuota(merchantId) {
  const month = smsMonth();
  const { data } = await db.from('sms_usage')
    .select('count').eq('merchant_id', merchantId).eq('month', month).maybeSingle();
  const used = data?.count || 0;
  const { data: m } = await db.from('merchants').select('plan').eq('id', merchantId).maybeSingle();
  const isPro = m?.plan === 'pro';
  const limit = isPro ? Infinity : SMS_FREE_QUOTA;
  return { used, limit, allowed: used < limit, isPro };
}

async function incrementSmsCount(merchantId) {
  const month = smsMonth();
  const { data } = await db.from('sms_usage')
    .select('id,count').eq('merchant_id', merchantId).eq('month', month).maybeSingle();
  if (data) {
    await db.from('sms_usage').update({ count: data.count + 1 }).eq('id', data.id);
  } else {
    await db.from('sms_usage').insert({ merchant_id: merchantId, month, count: 1 });
  }
}

// ── PRO PLAN CHECK HELPER ───────────────────────────────────────
async function isPro(merchantId) {
  const { data } = await db.from('merchants').select('plan,plan_expires_at').eq('id', merchantId).maybeSingle();
  if (!data || data.plan !== 'pro') return false;
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) return false;
  return true;
}

// ── STRIPE BILLING ──────────────────────────────────────────────
// Create Checkout Session (merchant subscribes to Pro)
app.post('/api/billing/checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
  const { merchantId } = req.body;
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;

  const { data: merchant } = await db.from('merchants').select('email,stripe_customer_id,name').eq('id', merchantId).maybeSingle();
  let customerId = merchant?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: merchant.email, name: merchant.name, metadata: { merchantId } });
    customerId = customer.id;
    await db.from('merchants').update({ stripe_customer_id: customerId }).eq('id', merchantId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${req.headers.origin || 'https://choppkar.com'}/dashboard?billing=success`,
    cancel_url: `${req.headers.origin || 'https://choppkar.com'}/dashboard?billing=cancel`,
    metadata: { merchantId },
  });
  res.json({ url: session.url });
});

// Customer portal (manage subscription, cancel, update card)
app.post('/api/billing/portal', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
  const { merchantId } = req.body;
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const { data: merchant } = await db.from('merchants').select('stripe_customer_id').eq('id', merchantId).maybeSingle();
  if (!merchant?.stripe_customer_id) return res.status(400).json({ error: 'No billing account' });
  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: `${req.headers.origin || 'https://choppkar.com'}/dashboard`,
  });
  res.json({ url: session.url });
});

// Billing status (for dashboard UI)
app.get('/api/billing/:merchantId', async (req, res) => {
  const m = await requireMerchant(req, res, req.params.merchantId);
  if (!m) return;
  const { data: merchant } = await db.from('merchants').select('plan,plan_expires_at,stripe_subscription_id').eq('id', req.params.merchantId).maybeSingle();
  const quota = await checkSmsQuota(req.params.merchantId);
  res.json({
    plan: merchant?.plan || 'free',
    expiresAt: merchant?.plan_expires_at || null,
    hasSubscription: !!merchant?.stripe_subscription_id,
    sms: { used: quota.used, limit: quota.isPro ? 'unlimited' : quota.limit },
  });
});

// Stripe Webhook handler (defined early, called with raw body)
async function handleStripeWebhook(req, res) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(503).send('Not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[stripe] webhook signature failed:', e.message);
    return res.status(400).send('Invalid signature');
  }

  const sub = event.data.object;
  const merchantId = sub.metadata?.merchantId || null;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (sub.mode === 'subscription' && sub.subscription) {
        const mid = sub.metadata?.merchantId;
        if (mid) {
          await db.from('merchants').update({
            plan: 'pro', stripe_subscription_id: sub.subscription, plan_expires_at: null,
          }).eq('id', mid);
          console.log(`[stripe] merchant ${mid} upgraded to Pro`);
        }
      }
      break;
    }
    case 'customer.subscription.updated': {
      const mid = sub.metadata?.merchantId;
      if (mid && sub.cancel_at_period_end) {
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await db.from('merchants').update({ plan_expires_at: expiresAt }).eq('stripe_subscription_id', sub.id);
        console.log(`[stripe] merchant ${mid} cancelling at ${expiresAt}`);
      } else if (mid && !sub.cancel_at_period_end) {
        await db.from('merchants').update({ plan_expires_at: null }).eq('stripe_subscription_id', sub.id);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      await db.from('merchants').update({ plan: 'free', stripe_subscription_id: null, plan_expires_at: null })
        .eq('stripe_subscription_id', sub.id);
      console.log(`[stripe] subscription ${sub.id} ended — downgraded to free`);
      break;
    }
    default:
      break;
  }
  res.json({ received: true });
}

// ── BRANCHES (多门店管理) ─────────────────────────────────────
app.get('/api/branches/:merchantId', async (req, res) => {
  const auth = await requireStaffOrMerchant(req, res, req.params.merchantId);
  if (!auth) return;
  const { data } = await db.from('branches')
    .select('*').eq('merchant_id', req.params.merchantId)
    .order('created_at', { ascending: true });
  res.json(data || []);
});

app.post('/api/branches', async (req, res) => {
  const { merchantId, name } = req.body;
  if (!merchantId || !name?.trim()) return res.status(400).json({ error: 'merchantId and name required' });
  const lenErr = checkLen([[name, LIMITS.branch, '分店名']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const { data, error } = await db.from('branches')
    .insert({ merchant_id: merchantId, name: name.trim() }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Branch already exists' });
    return res.status(400).json({ error: safeDbError(error) });
  }
  res.json(data);
});

app.delete('/api/branches/:id', async (req, res) => {
  const { data: br } = await db.from('branches').select('id,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!br) return res.status(404).json({ error: 'not found' });
  const m = await requireMerchant(req, res, br.merchant_id);
  if (!m) return;
  const { error } = await db.from('branches').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json({ ok: true });
});

// ── ADVANCED ANALYTICS (商家) ─────────────────────────────────
app.get('/api/analytics/:merchantId', async (req, res) => {
  const mid = req.params.merchantId;
  const m = await requireMerchant(req, res, mid);
  if (!m) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const branch = req.query.branch && req.query.branch !== 'all' ? req.query.branch : null;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));
  const sinceIso = since.toISOString();

  let stampQ = db.from('stamps').select('member_id,service,branch,created_at')
    .eq('merchant_id', mid).gte('created_at', sinceIso);
  if (branch) stampQ = stampQ.eq('branch', branch);

  const [stampsR, membersR, redeemR, stampCountsR] = await Promise.all([
    stampQ,
    db.from('members').select('id,created_at').eq('merchant_id', mid),
    db.from('redemptions').select('created_at').eq('merchant_id', mid).gte('created_at', sinceIso),
    db.rpc('stamp_counts_by_member', { mid }).catch(() => ({ data: null })),
  ]);
  const stamps = stampsR.data || [], members = membersR.data || [],
        redemptions = redeemR.data || [];

  // stamp counts per member — prefer DB aggregate, fallback to JS count
  let perMember = {};
  if (stampCountsR.data) {
    stampCountsR.data.forEach(r => { perMember[r.member_id] = r.cnt; });
  } else {
    const { data: allStamps } = await db.from('stamps').select('member_id').eq('merchant_id', mid);
    (allStamps || []).forEach(s => perMember[s.member_id] = (perMember[s.member_id] || 0) + 1);
  }

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

  // 等级分布 + 复购率
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

// ── SECURITY EVENTS (商家可查看自己的安全日志) ─────────────────
app.get('/api/security-events/:merchantId', async (req, res) => {
  const m = await requireMerchant(req, res, req.params.merchantId);
  if (!m) return;
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await db.from('security_events')
    .select('id,event_type,severity,ip,details,created_at')
    .or(`merchant_id.eq.${req.params.merchantId},merchant_id.is.null`)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);
  const summary = { total: 0, critical: 0, warn: 0, info: 0, topIps: {} };
  for (const e of (data || [])) {
    summary.total++;
    summary[e.severity] = (summary[e.severity] || 0) + 1;
    if (e.ip) summary.topIps[e.ip] = (summary.topIps[e.ip] || 0) + 1;
  }
  res.json({ events: data || [], summary });
});

// ── FEATURE TOGGLES (印章/存酒/储值券, 商家) ───────────────────
app.put('/api/merchant/:slug/features', async (req, res) => {
  const m = await requireMerchantBySlug(req, res, req.params.slug);
  if (!m) return;
  const { feature_stamp, feature_bottle, feature_voucher } = req.body;
  const patch = {};
  if (feature_stamp !== undefined) patch.feature_stamp = !!feature_stamp;
  if (feature_bottle !== undefined) patch.feature_bottle = !!feature_bottle;
  if (feature_voucher !== undefined) patch.feature_voucher = !!feature_voucher;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
  const { error } = await db.from('merchants').update(patch).eq('slug', req.params.slug);
  if (error) return res.status(400).json({ error: safeDbError(error) });
  res.json({ success: true });
});

// ── BOTTLE KEEP (存酒) ─────────────────────────────────────────
// 会员本人 token 或 员工 PIN 均可查看
app.get('/api/bottles', async (req, res) => {
  const { memberId, merchantId } = req.query;
  const mt = getMember(req);
  const ok = (mt && mt.memberId === memberId) || await getStaff(req, merchantId);
  if (!ok) return res.status(401).json({ error: '未授权' });
  const { data } = await db.from('bottle_keeps')
    .select('id,brand,size_ml,remaining_ml,photo_url,expires_at,created_at')
    .eq('member_id', memberId).eq('merchant_id', merchantId).gt('remaining_ml', 0)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/bottles', async (req, res) => {
  const { memberId, merchantId, brand, size_ml, photo_url, expires_at } = req.body;
  if (!memberId || !merchantId || !brand || !size_ml) return res.status(400).json({ error: 'memberId, merchantId, brand, size_ml required' });
  const lenErr = checkLen([[brand, LIMITS.brand, '品牌']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const staff = await getStaff(req, merchantId);
  if (!staff) return res.status(401).json({ error: '未授权' });
  const size = parseInt(size_ml);
  const { data, error } = await db.from('bottle_keeps').insert({
    member_id: memberId, merchant_id: merchantId, brand, size_ml: size, remaining_ml: size,
    photo_url: photo_url || null, expires_at: expires_at || null,
  }).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  await db.from('bottle_transactions').insert({ bottle_keep_id: data.id, type: 'deposit', amount_ml: size, note: '登记存酒' });
  res.json({ success: true, bottle: data });
});

app.post('/api/bottles/:id/pour', async (req, res) => {
  const { amount_ml, note, staffId } = req.body;
  const amt = parseInt(amount_ml);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'amount_ml 无效' });
  const { data: b } = await db.from('bottle_keeps').select('remaining_ml,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!b) return res.status(404).json({ error: '存酒不存在' });
  const staff = await getStaff(req, b.merchant_id);
  if (!staff) return res.status(401).json({ error: '未授权' });
  if (b.remaining_ml < amt) return res.status(400).json({ error: '剩余酒量不足' });
  const remaining = b.remaining_ml - amt;
  const { data: updated, error } = await db.from('bottle_keeps')
    .update({ remaining_ml: remaining })
    .eq('id', req.params.id).eq('remaining_ml', b.remaining_ml)
    .select('remaining_ml');
  if (error) return res.status(400).json({ error: safeDbError(error) });
  if (!updated?.length) return res.status(409).json({ error: '操作冲突，请重试' });
  await db.from('bottle_transactions').insert({ bottle_keep_id: req.params.id, type: 'pour', amount_ml: amt, note: note || null, staff_id: staffId || null });
  res.json({ success: true, remaining_ml: remaining });
});

app.get('/api/bottles/all', async (req, res) => {
  const { merchantId } = req.query;
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const { data } = await db.from('bottle_keeps').select('*,members(name,phone)')
    .eq('merchant_id', merchantId)
    .order('expires_at', { ascending: true, nullsFirst: false });
  const bottles = (data || []).map(b => ({ ...b, member_name: b.members?.name || '', member_phone: b.members?.phone || '', members: undefined }));
  res.json({ bottles });
});

app.get('/api/bottles/:id/transactions', async (req, res) => {
  const { data: bk } = await db.from('bottle_keeps').select('member_id,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!bk) return res.status(404).json({ error: '存酒不存在' });
  const mt = getMember(req);
  const ok = (mt && mt.memberId === bk.member_id) || await getStaff(req, bk.merchant_id);
  if (!ok) return res.status(401).json({ error: '未授权' });
  const { data } = await db.from('bottle_transactions').select('*')
    .eq('bottle_keep_id', req.params.id).order('created_at', { ascending: false }).limit(20);
  res.json(data || []);
});

// ── VOUCHERS (储值券) ──────────────────────────────────────────
// 会员本人 token 或 员工 PIN 均可查看
app.get('/api/vouchers', async (req, res) => {
  const { memberId, merchantId } = req.query;
  const mt = getMember(req);
  const ok = (mt && mt.memberId === memberId) || await getStaff(req, merchantId);
  if (!ok) return res.status(401).json({ error: '未授权' });
  const { data } = await db.from('vouchers').select('id,type,label,total,remaining,expires_at')
    .eq('member_id', memberId).eq('merchant_id', merchantId).gt('remaining', 0)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/vouchers', async (req, res) => {
  const { memberId, merchantId, type, label, total, expires_at } = req.body;
  if (!memberId || !merchantId || total == null) return res.status(400).json({ error: 'memberId, merchantId, total required' });
  const lenErr = checkLen([[label, LIMITS.label, '标签']]);
  if (lenErr) return res.status(400).json({ error: lenErr });
  const staff = await getStaff(req, merchantId);
  if (!staff) return res.status(401).json({ error: '未授权' });
  const tot = Number(total);
  const { data, error } = await db.from('vouchers').insert({
    member_id: memberId, merchant_id: merchantId, type: type || 'session', label: label || null,
    total: tot, remaining: tot, expires_at: expires_at || null,
  }).select().single();
  if (error) return res.status(400).json({ error: safeDbError(error) });
  await db.from('voucher_transactions').insert({ voucher_id: data.id, type: 'issue', amount: tot, note: '发券' });
  res.json({ success: true, voucher: data });
});

app.post('/api/vouchers/:id/redeem', async (req, res) => {
  const { amount, note, staffId } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'amount 无效' });
  const { data: v } = await db.from('vouchers').select('remaining,merchant_id').eq('id', req.params.id).maybeSingle();
  if (!v) return res.status(404).json({ error: '券不存在' });
  const staff = await getStaff(req, v.merchant_id);
  if (!staff) return res.status(401).json({ error: '未授权' });
  if (v.remaining < amt) return res.status(400).json({ error: '余额不足' });
  const remaining = v.remaining - amt;
  const { data: updated, error } = await db.from('vouchers')
    .update({ remaining })
    .eq('id', req.params.id).eq('remaining', v.remaining)
    .select('remaining');
  if (error) return res.status(400).json({ error: safeDbError(error) });
  if (!updated?.length) return res.status(409).json({ error: '操作冲突，请重试' });
  await db.from('voucher_transactions').insert({ voucher_id: req.params.id, type: 'redeem', amount: amt, note: note || null, staff_id: staffId || null });
  res.json({ success: true, remaining });
});

app.get('/api/vouchers/all', async (req, res) => {
  const { merchantId } = req.query;
  const m = await requireMerchant(req, res, merchantId);
  if (!m) return;
  const { data } = await db.from('vouchers').select('*,members(name,phone)')
    .eq('merchant_id', merchantId).gt('remaining', 0).order('created_at', { ascending: false });
  const vouchers = (data || []).map(v => ({ ...v, member_name: v.members?.name || '', member_phone: v.members?.phone || '', members: undefined }));
  res.json({ vouchers });
});

// ── FALLBACK: serve card.html for PWA routes ──────────────────
app.get('/card', (req, res) => res.sendFile('card.html', { root: 'public' }));
app.get('/staff', (req, res) => res.sendFile('staff.html', { root: 'public' }));
app.get('/dashboard', (req, res) => res.sendFile('dashboard.html', { root: 'public' }));
app.get('/bottle', (req, res) => res.sendFile('bottle.html', { root: 'public' }));
app.get('/privacy', (req, res) => res.sendFile('privacy.html', { root: 'public' }));
app.get('/terms', (req, res) => res.sendFile('terms.html', { root: 'public' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Choppkar running on port ${PORT}`));

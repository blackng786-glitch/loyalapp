# Project Tasks & Progress

> Single source of truth for progress. Items under "Done" are complete and
> verified — do not re-investigate them unless something downstream breaks.

Last updated: 2026-06-11

## 🔵 In Progress
- [ ] (nothing yet)

## 📋 To Do
- [ ] Verify OTP login works end-to-end on production (send real SMS, login, check session persists)

## ✅ Done
<!-- Newest at top. Format: - [x] task (YYYY-MM-DD) -->
- [x] Security hardening — server.js: HMAC member tokens (30d) + reg tickets (15min), merchant JWT auth (getAuthUser/requireMerchant), staff PIN header auth, requireStaffOrMerchant for shared endpoints, in-memory rate limiter (OTP send 1/min + 8/day per phone, 15/hr per IP; verify 10/hr; staff login 10/hr), field whitelists on PATCH endpoints, PostgREST or-filter injection fix (2026-06-11) — verified locally: guards 401, rate limit 429, staff PIN allow/deny, card page loads clean
- [x] Security hardening — card.html: removed exposed Supabase anon key + supabase-js CDN (unused), fetch patch auto-sends x-member-token, session requires server token, 401 → re-login (2026-06-11)
- [x] Security hardening — bottle.html: same token mechanism + 401 handling (2026-06-11)
- [x] Security hardening — staff.html: fetch patch auto-sends x-staff-pin after login (2026-06-11)
- [x] Security hardening — dashboard.html: fetch patch auto-sends Supabase JWT Bearer (2026-06-11)
- [x] migration-v6.sql created: drops all open RLS policies (deny-by-default); schema.sql updated to match (2026-06-11)
- [x] sw.js cache bump loyalapp-v1 → chopkar-v2 (2026-06-11)
- [x] Synced all security changes to loyalapp/ (2026-06-11)
- [x] User enabled Supabase Phone Auth provider (2026-06-11)
- [x] User ran migration-v5.sql in Supabase SQL Editor (2026-06-11)
- [x] OTP changes committed (f1276e3) and pushed to GitHub main → Railway auto-deploy (2026-06-11)
- [x] Customer OTP phone login — server.js endpoints: POST /api/auth/send-otp, POST /api/auth/verify-otp (2026-06-09)
- [x] Customer OTP phone login — card.html: OTP CSS, HTML views (v-otp, v-newname), full JS rewrite (sendOtp, verifyOtp, completeRegistration, session mgmt 30-day expiry, OTP auto-focus, countdown) (2026-06-09)
- [x] Customer OTP phone login — bottle.html: inline OTP auth flow (v-auth, v-otp, v-newname) replacing redirect to card.html, session mgmt, OTP JS (2026-06-09)
- [x] Sync OTP changes to loyalapp/ directory (2026-06-09)
- [x] Update schema.sql with bottle/voucher tables, indexes, RLS, trigger (2026-06-09)
- [x] Sync schema.sql to loyalapp/ (2026-06-09)
- [x] Bottle Keep feature — server.js endpoints (GET/POST /api/bottles, POST /api/bottles/:id/pour, GET /api/bottles/all, GET /api/bottles/:id/transactions) (previous session)
- [x] Voucher feature — server.js endpoints (GET/POST /api/vouchers, POST /api/vouchers/:id/redeem, GET /api/vouchers/all) (previous session)
- [x] Feature toggles endpoint — PUT /api/merchant/:slug/features (previous session)
- [x] Customer bottle page — public/bottle.html (previous session)
- [x] Staff bottle/voucher tab — updated public/staff.html (previous session)
- [x] Dashboard cellar management + feature toggles — updated public/dashboard.html (previous session)
- [x] migration-v5.sql generated (previous session)
- [x] ChopKar visual rebrand (all files) (previous session)
- [x] Branding settings page (dashboard) + logo upload (previous session)
- [x] Scheduled push marketing (previous session)
- [x] Multi-branch management (previous session)
- [x] Advanced analytics charts (previous session)
- [x] Supabase keep-alive GitHub Action (previous session)
- [x] Code sync root ↔ loyalapp (previous session)

## 🚧 Blocked / Needs me
- [ ] Twilio credentials in Supabase are INVALID (error 20003 "Authentication Error - invalid username") — OTP SMS cannot send until fixed in Supabase Dashboard → Authentication → Providers → Phone
- [ ] migration-v6.sql must be run in Supabase SQL Editor (closes public DB access)
- [ ] git push (user does this manually)

## 📝 Notes
- User instruction: 不要自己执行 git push (do NOT auto-push)
- Railway deploys from GitHub main branch (Nixpacks)
- Supabase project: https://hrwoejdyjxpohdvfzcga.supabase.co
- Brand colors: #993C1D (primary) / #D85A30 (accent) / #FAECE7 (light)
- migration-v3.sql = logo_url column; migration-v4.sql = bg_color column

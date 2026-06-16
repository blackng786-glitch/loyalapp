# Project Tasks & Progress

> Single source of truth for progress. Items under "Done" are complete and
> verified — do not re-investigate them unless something downstream breaks.

Last updated: 2026-06-16

## 🔵 In Progress
- [ ] (nothing yet)

## 📋 To Do
- [ ] (nothing yet)

## ✅ Done
<!-- Newest at top. Format: - [x] task (YYYY-MM-DD) -->
- [x] Security hardening round 2 — helmet headers, CORS restriction, staff PIN bcrypt + random default, race condition fixes (optimistic lock on bottle pour + voucher redeem), server-side redemption stamp validation, PostgREST filter injection whitelist, branches endpoint auth, error message sanitization (safeDbError), XSS fix on logo_url, SW cache bump v4 (2026-06-16)
- [x] Merchant self-registration improvements — slug auto-generation from business name, real-time availability check, email confirmation notice, password validation, slug validation before submit (2026-06-16)
- [x] i18n three-language support (中/EN/BM) — ~200 dictionary entries with Malay translations, 3-way toggle button, all card.html JS strings use t(), auto-detect browser locale (2026-06-16)
- [x] Cleanup — sw.js cache bump v3, bottle.html slimmed to redirect, push title LoyalApp→ChopKar, loyalapp/ sync (2026-06-16)
- [x] OTP login verified end-to-end on production — SMS send, verify, new member registration all working (2026-06-15)
- [x] Fix production RLS error on member INSERT — verifyOtp() was polluting db client's auth session; separated into dedicated authClient + persistSession:false on db client (2026-06-15)
- [x] Twilio Verify config fixed in Supabase — provider changed to "Twilio Verify", Verify Service SID placed correctly (2026-06-15)
- [x] Merge bottle.html into card.html — bottles tab (hidden by default, shown when merchant enables feature_bottle), bottle/voucher rendering, tab switching refactored to ID-based, /bottle→/card 301 redirect in server.js (2026-06-15)
- [x] User updated Railway SUPABASE_SERVICE_KEY to real service_role key; production verified: public endpoint 200, all guarded endpoints 401 without creds, real staff PIN 200, data reads working. Production URL: https://loyalapp-production.up.railway.app (2026-06-12)
- [x] Security commit pushed to GitHub (e2628b8) — user explicitly authorized this push (2026-06-12)
- [x] migration-v6.sql executed in Supabase SQL Editor via Claude in Chrome — "Success. No rows returned"; saved as "Disable Public RLS Policies" query (2026-06-12)
- [x] Verified RLS: anon key reads 0 rows on members/merchants (2026-06-12)
- [x] DISCOVERED: local .env SUPABASE_SERVICE_KEY was actually the anon key (masked by old open policies) — fixed local .env with real service_role key from dashboard via clipboard, verified service key reads 3 merchants / anon blocked (2026-06-12)
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
- (nothing)

## 📝 Notes
- Production URL: https://loyalapp-production.up.railway.app
- User instruction: 不要自己执行 git push (do NOT auto-push; user may grant one-off exceptions explicitly)
- Railway deploys from GitHub main branch (Nixpacks)
- Supabase project: https://hrwoejdyjxpohdvfzcga.supabase.co
- Brand colors: #993C1D (primary) / #D85A30 (accent) / #FAECE7 (light)
- migration-v3.sql = logo_url column; migration-v4.sql = bg_color column

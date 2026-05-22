# LoyalApp — Setup Guide

## What you have
- `schema.sql` — Database setup (run in Supabase)
- `server.js` — Backend API (deploy to Railway)
- `public/card.html` — Member PWA (installable to phone)
- `public/staff.html` — Staff stamp panel
- `public/dashboard.html` — Merchant portal
- `public/sw.js` — Service worker (enables PWA + push notifications)

---

## Step 1 — Supabase Database (5 min)

1. Go to [supabase.com](https://supabase.com) → Create project
2. SQL Editor → New Query → paste `schema.sql` → Run
3. Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`
4. Authentication → Providers → Email → Enable

---

## Step 2 — Generate VAPID Keys (push notifications)

Run this once in your terminal:
```bash
npx web-push generate-vapid-keys
```
Copy the two keys into your `.env` file.

---

## Step 3 — Deploy to Railway (10 min)

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables (Railway → Variables tab):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
VAPID_PUBLIC_KEY=BExxx...
VAPID_PRIVATE_KEY=xxx...
CONTACT_EMAIL=your@email.com
```

5. Railway auto-deploys. Copy your app URL (e.g. `https://loyalapp.up.railway.app`)

---

## Step 4 — Update app URLs

In `public/card.html` and `public/dashboard.html`, find and update:
```javascript
const SUPA_URL = 'YOUR_SUPABASE_URL';
const SUPA_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

---

## Step 5 — Your first merchant (Neue Car Spa)

1. Go to `https://your-app.railway.app/dashboard`
2. Create account with your email
3. Fill in the setup wizard:
   - Business Name: `Neue Car Spa`
   - Slug: `neue-car-spa`
   - Brand Color: `#C9A84C`
   - Services: Add your services
   - Staff PIN: Choose a PIN
4. Click "Launch My Loyalty Program"

---

## How customers use it

Share this link: `https://your-app.railway.app/card?m=neue-car-spa`

On Android: Opens in Chrome → banner appears "Add to Home Screen" → installs as PWA
On iPhone: Open in Safari → Share → Add to Home Screen → installs as PWA

---

## How staff uses it

Share this link: `https://your-app.railway.app/staff?m=neue-car-spa`

Staff enters PIN → searches member by name/phone → taps "Add Stamp" → done.

---

## Adding a new merchant (friend's business)

They go to `/dashboard` → create account → setup wizard → get their own links.
Each merchant is completely separate with their own members, staff, and card design.

---

## Custom domain (optional)

In Railway → Settings → Custom Domain → add `app.yourdomain.com`
Update DNS at your domain registrar (CNAME to Railway).

---

## URLs summary

| Page | URL |
|------|-----|
| Merchant portal | `/dashboard` |
| Member card | `/card?m=SLUG` |
| Staff panel | `/staff?m=SLUG` |
| PWA manifest | `/manifest/SLUG.json` |

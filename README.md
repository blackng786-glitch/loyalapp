# Choppkar

A multi-tenant loyalty program SaaS platform for F&B merchants. Merchants get a branded digital stamp card, customer management, and marketing tools — customers collect stamps and redeem rewards from their phone.

**Live:** [choppkar.com](https://choppkar.com)

## Features

- **Digital Stamp Cards** — QR scan to collect stamps, configurable rewards
- **OTP Phone Login** — SMS verification via Twilio, no passwords for customers
- **Member Tiers** — Spending-based auto-upgrade (Bronze → Silver → Gold → Platinum)
- **Bottle Keep & Vouchers** — Store purchased bottles and vouchers for future use
- **Referral Program** — Members share invite codes, both get bonus stamps
- **Push Notifications** — Web Push for marketing campaigns and order updates
- **Staff Panel** — PIN-authenticated staff view for stamping, redeeming, and member management
- **Merchant Dashboard** — Analytics, branding, feature toggles, multi-branch support
- **Stripe Billing** — Free / Pro / Business tier subscription (SaaS model)
- **i18n** — Chinese, English, and Bahasa Melayu

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (merchant), HMAC-signed tokens (customer), bcrypt PIN (staff) |
| Payments | Stripe Checkout + Customer Portal |
| Push | Web Push API (VAPID) |
| Frontend | Vanilla HTML/CSS/JS (PWA) |
| Hosting | Railway (auto-deploy from GitHub) |
| CI | GitHub Actions (Supabase keep-alive) |

## Project Structure

```
├── server.js              # Express API server (all endpoints)
├── public/
│   ├── index.html         # Landing page
│   ├── card.html          # Customer stamp card (PWA)
│   ├── staff.html         # Staff panel
│   ├── dashboard.html     # Merchant dashboard
│   ├── privacy.html       # Privacy policy
│   ├── terms.html         # Terms of service
│   ├── sw.js              # Service worker
│   └── manifest.json      # PWA manifest
├── schema.sql             # Database schema + migrations
├── .github/workflows/     # GitHub Actions
└── .env.example           # Environment variable template
```

## Getting Started

### Prerequisites

- Node.js >= 18
- A [Supabase](https://supabase.com) project
- (Optional) Stripe account for billing
- (Optional) VAPID keys for push notifications

### Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/your-username/choppkar.git
   cd choppkar
   npm install
   ```

2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Run the database migrations in your Supabase SQL Editor:
   ```
   schema.sql → then migration-v5.sql through migration-v12.sql
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000` in your browser.

## Security

- All API secrets stored as environment variables, never in code
- Supabase RLS (deny-by-default) on all tables
- HMAC-signed member tokens with 90-day TTL
- Staff PIN authentication with bcrypt hashing
- Rate limiting on OTP, PIN, and auth endpoints
- IP-based intrusion detection with auto-ban
- Helmet security headers + CORS restriction
- AI crawler blocking (robots.txt + server middleware)

## License

All rights reserved.

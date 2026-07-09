#!/usr/bin/env node
/**
 * Choppkar data backup.
 * Dumps every table to timestamped JSON files under backups/<UTC-timestamp>/.
 * Paginates (Supabase caps rows/response) so large tables are captured in full.
 * A missing table is warned and skipped, never fatal — so a new migration
 * can't silently drop a table from the backup set.
 *
 * Usage:  node scripts/backup.js
 * Env:    SUPABASE_URL, SUPABASE_SERVICE_KEY  (from .env)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const TABLES = [
  'merchants', 'staff', 'members', 'stamps', 'redemptions',
  'push_subscriptions', 'scheduled_pushes', 'branches',
  'bottle_keeps', 'bottle_transactions', 'vouchers', 'voucher_transactions',
  'security_events', 'referrals', 'sms_usage', 'auto_campaigns', 'tier_history',
];

const PAGE = 1000;

async function dumpTable(table) {
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').range(from, from + PAGE - 1);
    if (error) {
      if (/does not exist|not found|schema cache/i.test(error.message)) {
        console.warn(`  ⚠ skip ${table} (not present): ${error.message}`);
        return null;
      }
      throw new Error(`${table}: ${error.message}`);
    }
    all = all.concat(data);
    if (data.length < PAGE) break;
  }
  return all;
}

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Backup → ${dir}`);

  const manifest = { createdAt: new Date().toISOString(), tables: {} };
  let grandTotal = 0;

  for (const t of TABLES) {
    try {
      const rows = await dumpTable(t);
      if (rows === null) { manifest.tables[t] = 'skipped'; continue; }
      fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 2));
      manifest.tables[t] = rows.length;
      grandTotal += rows.length;
      console.log(`  ✓ ${t}: ${rows.length} rows`);
    } catch (e) {
      manifest.tables[t] = `ERROR: ${e.message}`;
      console.error(`  ✗ ${t}: ${e.message}`);
    }
  }

  manifest.totalRows = grandTotal;
  fs.writeFileSync(path.join(dir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Done — ${grandTotal} rows across ${TABLES.length} tables.`);
})().catch(e => { console.error('Backup failed:', e.message); process.exit(1); });

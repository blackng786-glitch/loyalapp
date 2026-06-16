-- migration-v7: Security events table for intrusion detection
-- Run in Supabase SQL Editor

CREATE TABLE public.security_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  severity    text NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info','warn','critical')),
  ip          text,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sec_events_type     ON public.security_events(event_type);
CREATE INDEX idx_sec_events_time     ON public.security_events(created_at DESC);
CREATE INDEX idx_sec_events_ip       ON public.security_events(ip);
CREATE INDEX idx_sec_events_merchant ON public.security_events(merchant_id);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete events older than 90 days (run via pg_cron or manual)
-- DELETE FROM public.security_events WHERE created_at < now() - interval '90 days';

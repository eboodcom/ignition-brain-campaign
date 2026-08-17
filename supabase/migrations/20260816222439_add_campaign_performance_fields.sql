ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS traffic_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS test_status text NOT NULL DEFAULT 'testing';

-- Optionally, add a CHECK constraint for allowed test_status values
ALTER TABLE public.campaigns
  ADD CONSTRAINT IF NOT EXISTS test_status_allowed CHECK (test_status IN ('testing', 'winner', 'loser', 'paused'));

-- Prevent negative values
ALTER TABLE public.campaigns
  ADD CONSTRAINT IF NOT EXISTS traffic_sent_nonneg CHECK (traffic_sent >= 0),
  ADD CONSTRAINT IF NOT EXISTS leads_nonneg CHECK (leads >= 0),
  ADD CONSTRAINT IF NOT EXISTS sales_nonneg CHECK (sales >= 0),
  ADD CONSTRAINT IF NOT EXISTS cost_nonneg CHECK (cost >= 0),
  ADD CONSTRAINT IF NOT EXISTS revenue_nonneg CHECK (revenue >= 0);

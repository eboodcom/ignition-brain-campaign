ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS raw_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mailer_html text NOT NULL DEFAULT '';
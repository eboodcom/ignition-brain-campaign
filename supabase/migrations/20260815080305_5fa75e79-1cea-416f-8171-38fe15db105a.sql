CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  offer TEXT NOT NULL DEFAULT 'Other',
  traffic_source TEXT NOT NULL DEFAULT 'Other',
  test_number INTEGER,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  html_creative TEXT NOT NULL DEFAULT '',
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9][a-z0-9_-]*$' THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;
  IF NEW.destination_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Destination URL must start with http:// or https://';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_validate
BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.validate_campaign();

CREATE OR REPLACE FUNCTION public.follow_campaign_link(_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dest TEXT;
BEGIN
  UPDATE public.campaigns
     SET click_count = click_count + 1,
         last_clicked_at = now()
   WHERE slug = lower(trim(_slug))
     AND is_active = true
  RETURNING destination_url INTO _dest;
  RETURN _dest;
END;
$$;

REVOKE ALL ON FUNCTION public.follow_campaign_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.follow_campaign_link(TEXT) TO anon, authenticated, service_role;

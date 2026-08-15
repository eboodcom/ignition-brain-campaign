import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/** Temporary self-test: verifies the owner credentials sign in. Returns a boolean only. */
export const ownerSelfTest = createServerFn({ method: "POST" }).handler(async () => {
  const email = process.env["OWNER_EMAIL"]?.trim();
  const password = process.env["OWNER_PASSWORD"];
  if (!email || !password) return { ok: false, reason: "secrets-missing" };
  const client = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { ok: !!data.session && !error, reason: error ? error.message : "ok" };
});

import { createServerFn } from "@tanstack/react-start";

/**
 * Returns whether the submitted email matches the private OWNER_EMAIL secret.
 * The secret value is never returned to the client or logged.
 */
export const isOwnerEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => ({ email: String(data?.email ?? "") }))
  .handler(async ({ data }) => {
    const owner = process.env["OWNER_EMAIL"];
    if (!owner) return { ok: true, configured: false };
    return {
      ok: data.email.trim().toLowerCase() === owner.trim().toLowerCase(),
      configured: true,
    };
  });

/**
 * Idempotently provisions the single owner auth account from the OWNER_EMAIL /
 * OWNER_PASSWORD secrets. Takes no input, so it cannot be used to set or probe
 * credentials. Never returns or logs secret values.
 */
export const ensureOwnerAccount = createServerFn({ method: "POST" }).handler(async () => {
  const email = process.env["OWNER_EMAIL"]?.trim();
  const password = process.env["OWNER_PASSWORD"];
  if (!email || !password) return { provisioned: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) return { provisioned: false as const };

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!existing) {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    return { provisioned: !error };
  }

  // Keep the stored credentials in sync with the configured secrets.
  const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  return { provisioned: !error };
});

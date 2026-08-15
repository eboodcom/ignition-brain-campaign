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

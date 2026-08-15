import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link unavailable</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0f16;color:#e8eaf0;font-family:system-ui,sans-serif;text-align:center;padding:24px}p{color:#96a0b5}</style></head><body><div><h1>Link unavailable</h1><p>This link doesn't exist or is no longer active.</p></div></body></html>`;

export const Route = createFileRoute("/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = String(params.slug ?? "").toLowerCase();

        if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
          return new Response(NOT_FOUND_HTML, {
            status: 404,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }

        const { data, error } = await supabase.rpc("follow_campaign_link", { _slug: slug });

        if (error || !data) {
          return new Response(NOT_FOUND_HTML, {
            status: 404,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }

        return new Response(null, {
          status: 302,
          headers: {
            location: data,
            "cache-control": "no-store, no-cache, must-revalidate",
            "referrer-policy": "no-referrer-when-downgrade",
          },
        });
      },
    },
  },
});

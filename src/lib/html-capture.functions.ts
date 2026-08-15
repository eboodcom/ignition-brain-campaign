import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BLOCKED_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local)$/i;

function isSafeHttpUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOST.test(host) || host.endsWith(".local") || host === "localhost") return null;
  return url;
}

/**
 * Fetches the destination page of an owner-owned campaign server-side and
 * stores the raw HTML snapshot in html_creative. Only operates on destination
 * URLs already stored on campaign rows the authenticated caller can read (RLS).
 */
export const captureCampaignHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { campaignId: string; force?: boolean }) => ({
    campaignId: String(data?.campaignId ?? ""),
    force: Boolean(data?.force),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("id, destination_url, html_creative")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return { status: "error" as const, message: "Campaign not found", html: null };
    }

    if (!data.force && campaign.html_creative && campaign.html_creative.trim().length > 0) {
      return { status: "cached" as const, message: "Using saved HTML", html: campaign.html_creative };
    }

    const url = isSafeHttpUrl(campaign.destination_url);
    if (!url) {
      return { status: "error" as const, message: "Destination URL is not a fetchable public http(s) address", html: null };
    }

    let html: string;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; IgnitionBrainCampaigns/1.0; +https://go.dailyincomesteps.com)",
          accept: "text/html,application/xhtml+xml",
        },
      }).finally(() => clearTimeout(timer));

      if (!res.ok) {
        return { status: "error" as const, message: `Destination returned ${res.status}`, html: null };
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
        return { status: "error" as const, message: `Destination is not an HTML page (${contentType.split(";")[0]})`, html: null };
      }
      html = await res.text();
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      return {
        status: "error" as const,
        message: aborted ? "Destination page timed out" : "Unable to reach the destination page",
        html: null,
      };
    }

    if (!html.trim()) {
      return { status: "error" as const, message: "Destination page returned no content", html: null };
    }

    const { error: saveError } = await supabase
      .from("campaigns")
      .update({ html_creative: html })
      .eq("id", campaign.id);

    if (saveError) {
      return { status: "error" as const, message: "Fetched, but could not save the snapshot", html };
    }

    return { status: "captured" as const, message: "HTML captured", html };
  });

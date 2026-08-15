import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildMailerHtml, findUnresolvedUrls, makePortable } from "./html-portable.server";

const BLOCKED_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local)$/i;

const BRAND_DOMAIN = "https://go.dailyincomesteps.com";

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
 * Fetches the destination page of an owner-owned campaign server-side and stores:
 *  - raw_source: the untouched original HTML (provenance)
 *  - html_creative: the portable page snapshot with every relative URL resolved
 *  - mailer_html: an email-safe creative (generated only when missing)
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
      .select("id, slug, campaign_name, offer, destination_url, html_creative, raw_source, mailer_html")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return { status: "error" as const, message: "Campaign not found", html: null, mailer: null, unresolved: [] as string[] };
    }

    if (!data.force && campaign.html_creative && campaign.html_creative.trim().length > 0) {
      return {
        status: "cached" as const,
        message: "Using saved snapshot",
        html: campaign.html_creative,
        mailer: campaign.mailer_html ?? "",
        unresolved: findUnresolvedUrls(campaign.html_creative),
      };
    }

    const url = isSafeHttpUrl(campaign.destination_url);
    if (!url) {
      return {
        status: "error" as const,
        message: "Destination URL is not a fetchable public http(s) address",
        html: null,
        mailer: null,
        unresolved: [] as string[],
      };
    }

    let raw: string;
    let finalUrl = url.toString();
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
        return { status: "error" as const, message: `Destination returned ${res.status}`, html: null, mailer: null, unresolved: [] as string[] };
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
        return {
          status: "error" as const,
          message: `Destination is not an HTML page (${contentType.split(";")[0]})`,
          html: null,
          mailer: null,
          unresolved: [] as string[],
        };
      }
      finalUrl = res.url || finalUrl;
      raw = await res.text();
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      return {
        status: "error" as const,
        message: aborted ? "Destination page timed out" : "Unable to reach the destination page",
        html: null,
        mailer: null,
        unresolved: [] as string[],
      };
    }

    if (!raw.trim()) {
      return { status: "error" as const, message: "Destination page returned no content", html: null, mailer: null, unresolved: [] as string[] };
    }

    const portable = makePortable(raw, finalUrl);
    const unresolved = findUnresolvedUrls(portable);

    const ctaUrl = `${BRAND_DOMAIN}/${campaign.slug}`;
    const mailer =
      campaign.mailer_html && campaign.mailer_html.trim() && !data.force
        ? campaign.mailer_html
        : buildMailerHtml(portable, { ctaUrl, campaignName: campaign.campaign_name, offer: campaign.offer });

    const { error: saveError } = await supabase
      .from("campaigns")
      .update({ raw_source: raw, html_creative: portable, mailer_html: mailer })
      .eq("id", campaign.id);

    if (saveError) {
      return { status: "error" as const, message: "Fetched, but could not save the snapshot", html: portable, mailer, unresolved };
    }

    if (unresolved.length > 0) {
      return {
        status: "incomplete" as const,
        message: `Portable HTML incomplete — ${unresolved.length} unresolved path(s): ${unresolved.slice(0, 3).join(", ")}`,
        html: portable,
        mailer,
        unresolved,
      };
    }

    return { status: "captured" as const, message: "Portable snapshot captured", html: portable, mailer, unresolved };
  });

/** Rebuilds the email-safe mailer HTML from the stored portable page snapshot. */
export const regenerateMailerHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { campaignId: string; ctaLabel?: string }) => ({
    campaignId: String(data?.campaignId ?? ""),
    ctaLabel: data?.ctaLabel ? String(data.ctaLabel) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("id, slug, campaign_name, offer, html_creative")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) return { status: "error" as const, message: "Campaign not found", mailer: null };
    if (!campaign.html_creative?.trim())
      return { status: "error" as const, message: "Capture a page snapshot first", mailer: null };

    const mailer = buildMailerHtml(campaign.html_creative, {
      ctaUrl: `${BRAND_DOMAIN}/${campaign.slug}`,
      ctaLabel: data.ctaLabel,
      campaignName: campaign.campaign_name,
      offer: campaign.offer,
    });

    const { error: saveError } = await supabase
      .from("campaigns")
      .update({ mailer_html: mailer })
      .eq("id", campaign.id);

    if (saveError) return { status: "error" as const, message: "Could not save the mailer HTML", mailer };
    return { status: "ok" as const, message: "Mailer HTML regenerated", mailer };
  });

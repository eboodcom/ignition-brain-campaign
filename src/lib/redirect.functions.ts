import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isAllowedOrigin,
  isValidDestination,
  isValidSlug,
  probeDestination,
  probeRedirect,
} from "./redirect-check.server";

const BRAND_DOMAIN = "https://go.dailyincomesteps.com";

/**
 * Normalises and repairs a campaign's redirect mapping (slug + destination on its own row),
 * then reports whether the public route actually serves a 302.
 * Never creates a second record: it always updates the campaign in place.
 */
export const generateRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { campaignId: string; origin?: string }) => ({
    campaignId: String(data?.campaignId ?? ""),
    origin: data?.origin ? String(data.origin) : "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("id, slug, destination_url, is_active")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return { ok: false as const, message: "Campaign not found" };
    }

    const slug = campaign.slug.trim().toLowerCase();
    if (!isValidSlug(slug)) {
      return { ok: false as const, message: "Slug must be lowercase letters, numbers, - or _" };
    }
    if (!isValidDestination(campaign.destination_url)) {
      return { ok: false as const, message: "Destination must be a valid http(s) URL" };
    }

    if (slug !== campaign.slug) {
      const { error: saveError } = await supabase
        .from("campaigns")
        .update({ slug })
        .eq("id", campaign.id);
      if (saveError) {
        return {
          ok: false as const,
          message: saveError.message.includes("duplicate")
            ? "Another campaign already uses that slug"
            : "Could not save the redirect mapping",
        };
      }
    }

    return { ok: true as const, message: "Redirect mapping ready", slug };
  });

/**
 * Verifies a campaign redirect end to end: mapping, app route 302 and branded domain.
 */
export const verifyRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { campaignId: string; origin?: string }) => ({
    campaignId: String(data?.campaignId ?? ""),
    origin: data?.origin ? String(data.origin) : "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("id, slug, destination_url, is_active")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return {
        overall: "not-generated" as const,
        mapping: "Campaign not found",
        appRoute: "Not tested",
        brandedDomain: "Not tested",
        destination: "Not tested",
        shortUrl: "",
        testUrl: "",
        domainConnected: false,
      };
    }

    const slug = campaign.slug.trim().toLowerCase();
    const shortUrl = `${BRAND_DOMAIN}/${slug}`;
    const origin = isAllowedOrigin(data.origin) ? data.origin.replace(/\/+$/, "") : "";
    const testUrl = origin ? `${origin}/${slug}` : "";

    if (!isValidSlug(slug) || !isValidDestination(campaign.destination_url)) {
      return {
        overall: "not-generated" as const,
        mapping: !isValidSlug(slug) ? "Invalid slug" : "Invalid destination URL",
        appRoute: "Not tested",
        brandedDomain: "Not tested",
        destination: "Not tested",
        shortUrl,
        testUrl,
        domainConnected: false,
      };
    }

    if (!campaign.is_active) {
      return {
        overall: "inactive" as const,
        mapping: "Mapping exists (link disabled)",
        appRoute: "Skipped — campaign is inactive",
        brandedDomain: "Skipped — campaign is inactive",
        destination: "Not tested",
        shortUrl,
        testUrl,
        domainConnected: false,
      };
    }

    const [route, branded, dest] = await Promise.all([
      testUrl
        ? probeRedirect(testUrl, campaign.destination_url)
        : Promise.resolve({
            status: "error" as const,
            httpStatus: null,
            location: null,
            detail: "No app origin supplied",
          }),
      probeRedirect(shortUrl, campaign.destination_url),
      probeDestination(campaign.destination_url),
    ]);

    const domainConnected = branded.status === "working" || branded.status === "wrong-target";

    const overall =
      route.status === "working"
        ? ("working" as const)
        : route.status === "not-found"
          ? ("not-generated" as const)
          : ("destination-error" as const);

    return {
      overall: !dest.ok && route.status === "working" ? ("destination-error" as const) : overall,
      mapping: "Working",
      appRoute:
        route.status === "working"
          ? "Working"
          : route.status === "not-found"
            ? "Not found"
            : route.detail,
      brandedDomain: domainConnected
        ? branded.status === "working"
          ? "Working"
          : branded.detail
        : "Not connected",
      destination: dest.detail,
      shortUrl,
      testUrl,
      domainConnected,
    };
  });

/** Reports whether the branded redirect domain resolves at all. */
export const checkBrandDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const probe = await probeRedirect(`${BRAND_DOMAIN}/__health-check`, "");
    const connected = probe.status !== "unreachable";
    return {
      domain: "go.dailyincomesteps.com",
      connected,
      detail: connected ? "Domain resolves to this app" : probe.detail,
    };
  });

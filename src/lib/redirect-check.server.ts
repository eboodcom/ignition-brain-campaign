/** Server-only helpers for verifying that a short link actually issues a 302. */

export type ProbeResult = {
  status: "working" | "unreachable" | "wrong-target" | "not-found" | "error";
  httpStatus: number | null;
  location: string | null;
  detail: string;
};

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/.test(slug);
}

export function isValidDestination(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function sameTarget(a: string, b: string): boolean {
  const norm = (v: string) => v.replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

/** Requests `url` without following redirects and reports whether it 302s to `expected`. */
export async function probeRedirect(url: string, expected: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "IgnitionBrainCampaigns-RedirectCheck/1.0" },
    });
    const location = res.headers.get("location");
    if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
      if (location && sameTarget(location, expected)) {
        return { status: "working", httpStatus: res.status, location, detail: `${res.status} → destination` };
      }
      return {
        status: "wrong-target",
        httpStatus: res.status,
        location,
        detail: `Redirects to a different URL (${location ?? "unknown"})`,
      };
    }
    if (res.status === 404) {
      return { status: "not-found", httpStatus: 404, location: null, detail: "Slug not found or link disabled" };
    }
    return { status: "error", httpStatus: res.status, location, detail: `Unexpected ${res.status}` };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      status: "unreachable",
      httpStatus: null,
      location: null,
      detail: aborted ? "Timed out" : "Host not reachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Checks the destination page itself responds (HEAD, falls back to GET). */
export async function probeDestination(url: string): Promise<{ ok: boolean; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "IgnitionBrainCampaigns-RedirectCheck/1.0" },
    });
    return { ok: res.ok, detail: res.ok ? `Reachable (${res.status})` : `Destination returned ${res.status}` };
  } catch {
    return { ok: false, detail: "Destination not reachable" };
  } finally {
    clearTimeout(timer);
  }
}

/** Only allow probing our own app origins. */
export function isAllowedOrigin(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return (
      u.hostname === "localhost" ||
      u.hostname.endsWith(".lovable.app") ||
      u.hostname.endsWith(".dailyincomesteps.com")
    );
  } catch {
    return false;
  }
}

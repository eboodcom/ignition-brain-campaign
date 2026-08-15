/**
 * Server-only helpers that turn a raw captured page into:
 *  - a PORTABLE PAGE SNAPSHOT (every relative URL resolved against the final page URL)
 *  - an EMAIL-SAFE MAILER HTML version (no JS, no forms, absolute image URLs, inline CSS)
 */

const URL_ATTRS = [
  "src",
  "href",
  "action",
  "poster",
  "data-src",
  "background",
  "formaction",
] as const;

function resolve(raw: string, base: URL): string {
  const value = raw.trim();
  if (!value) return raw;
  if (/^(https?:|data:|mailto:|tel:|javascript:|#|cid:)/i.test(value)) return value;
  try {
    return new URL(value, base).toString();
  } catch {
    return raw;
  }
}

function resolveSrcset(raw: string, base: URL): string {
  return raw
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const [url = "", ...rest] = trimmed.split(/\s+/);
      return [resolve(url, base), ...rest].join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function resolveCssUrls(css: string, base: URL): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, quote: string, url: string) => {
    return `url(${quote}${resolve(url, base)}${quote})`;
  });
}

/** Rewrites every relative resource reference in `html` to an absolute URL. */
export function makePortable(html: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  let out = html;

  // Strip <base href> so our absolute URLs aren't re-based by the browser.
  out = out.replace(/<base\b[^>]*>/gi, "");

  // Standard URL-bearing attributes.
  for (const attr of URL_ATTRS) {
    const re = new RegExp(`(\\s${attr}\\s*=\\s*)(["'])([^"']*)\\2`, "gi");
    out = out.replace(re, (_m, lead: string, q: string, value: string) => `${lead}${q}${resolve(value, base)}${q}`);
  }

  // srcset / imagesrcset (comma separated candidate lists).
  out = out.replace(
    /(\s(?:srcset|imagesrcset)\s*=\s*)(["'])([^"']*)\2/gi,
    (_m, lead: string, q: string, value: string) => `${lead}${q}${resolveSrcset(value, base)}${q}`,
  );

  // Inline style attributes with url(...)
  out = out.replace(
    /(\sstyle\s*=\s*)(["'])([^"']*)\2/gi,
    (_m, lead: string, q: string, value: string) => `${lead}${q}${resolveCssUrls(value, base)}${q}`,
  );

  // <style> blocks with url(...)
  out = out.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_m, open: string, css: string, close: string) => `${open}${resolveCssUrls(css, base)}${close}`,
  );

  return out;
}

/**
 * Returns the unresolved root/relative references still present in a portable
 * snapshot. An empty array means the snapshot is fully portable.
 */
export function findUnresolvedUrls(html: string): string[] {
  const found = new Set<string>();
  const attrRe = /\s(src|href|action|poster|srcset|data-src|background)\s*=\s*(["'])([^"']*)\2/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html))) {
    const isSrcset = (m[1] ?? "").toLowerCase() === "srcset";
    const raw = m[3] ?? "";
    const candidates = isSrcset ? raw.split(",") : [raw];
    for (const candidate of candidates) {
      const value = (isSrcset ? candidate.trim().split(/\s+/)[0] : candidate.trim()) ?? "";
      if (!value) continue;
      if (/^(https?:|data:|mailto:|tel:|javascript:|#|cid:|\{)/i.test(value)) continue;
      found.add(value);
    }
  }
  const cssRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  while ((m = cssRe.exec(html))) {
    const value = (m[2] ?? "").trim();
    if (/^(https?:|data:|#|\{)/i.test(value)) continue;
    found.add(value);
  }
  return [...found].slice(0, 20);
}

/* ---------------------------------------------------------------- mailer -- */

function stripTag(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
}

function decode(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BOILERPLATE =
  /(privacy policy|terms (and|&) conditions|income disclosure|all rights reserved|unsubscribe|cookie|never sell,? rent|anti-?spam|copyright|©)/i;

type Block = { type: "image"; src: string; alt: string } | { type: "text"; level: number; text: string };

/** Extracts headline/copy/image blocks from a portable snapshot, in document order. */
function extractBlocks(portable: string): Block[] {
  let body = portable;
  const bodyMatch = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(portable);
  if (bodyMatch?.[1]) body = bodyMatch[1];

  for (const tag of ["script", "style", "noscript", "iframe", "form", "svg", "nav", "footer", "head"]) {
    body = stripTag(body, tag);
  }

  const blocks: Block[] = [];
  const re = /<img\b[^>]*>|<(h1|h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  const seenImages = new Set<string>();
  const seenText = new Set<string>();

  while ((m = re.exec(body))) {
    const chunk = m[0];
    if (chunk.toLowerCase().startsWith("<img")) {
      const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(chunk)?.[1];
      if (!src || !/^https:\/\//i.test(src)) continue;
      if (/\.(gif)$/i.test(src) && /spacer|pixel|blank/i.test(src)) continue;
      if (seenImages.has(src)) continue;
      seenImages.add(src);
      const alt = /\salt\s*=\s*["']([^"']*)["']/i.exec(chunk)?.[1] ?? "";
      blocks.push({ type: "image", src, alt: decode(alt) });
      continue;
    }
    const tag = (m[1] ?? "").toLowerCase();
    const text = decode((m[2] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text.length < 3 || text.length > 600) continue;
    if (BOILERPLATE.test(text)) continue;
    const key = text.toLowerCase();
    if (seenText.has(key)) continue;
    seenText.add(key);
    const level = tag === "h1" ? 1 : tag === "h2" ? 2 : tag === "h3" ? 3 : 4;
    blocks.push({ type: "text", level, text });
  }

  return blocks;
}

export type MailerOptions = {
  ctaUrl: string;
  ctaLabel?: string | undefined;
  campaignName: string;
  offer?: string | undefined;
  maxImages?: number;
  maxTextBlocks?: number;
};

/**
 * Builds an email-safe HTML creative from a portable page snapshot.
 * No JavaScript, no forms, table-based layout, inline CSS, absolute image URLs.
 */
export function buildMailerHtml(portable: string, options: MailerOptions): string {
  const maxImages = options.maxImages ?? 4;
  const maxText = options.maxTextBlocks ?? 10;
  const blocks = extractBlocks(portable);

  const title = blocks.find((b) => b.type === "text" && b.level <= 2 && b.text.length > 12);
  const headline = title && title.type === "text" ? title.text : options.campaignName;

  const offer = options.offer?.trim();
  const ctaLabel =
    options.ctaLabel?.trim() ||
    (offer && offer.toLowerCase() !== "other"
      ? `SEE HOW ${offer.toUpperCase()} WORKS`
      : "SEE HOW IT WORKS");

  let imageCount = 0;
  let textCount = 0;
  const rows: string[] = [];

  for (const block of blocks) {
    if (block.type === "image") {
      if (imageCount >= maxImages) continue;
      imageCount += 1;
      rows.push(
        `        <tr><td align="center" style="padding:0 0 18px 0;">` +
          `<a href="${escapeHtml(options.ctaUrl)}" target="_blank" style="text-decoration:none;">` +
          `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || headline)}" width="600" ` +
          `style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" /></a></td></tr>`,
      );
      continue;
    }
    if (block === title) continue;
    if (textCount >= maxText) continue;
    textCount += 1;
    const size = block.level <= 2 ? 20 : block.level === 3 ? 17 : 15;
    const weight = block.level <= 3 ? 700 : 400;
    rows.push(
      `        <tr><td style="padding:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:${size}px;` +
        `line-height:1.5;font-weight:${weight};color:#222222;">${escapeHtml(block.text)}</td></tr>`,
    );
  }

  const ctaRow =
    `        <tr><td align="center" style="padding:10px 0 6px 0;">` +
    `<a href="${escapeHtml(options.ctaUrl)}" target="_blank" ` +
    `style="display:inline-block;background-color:#ff6a13;color:#ffffff;font-family:Arial,Helvetica,sans-serif;` +
    `font-size:18px;font-weight:bold;line-height:1.2;text-decoration:none;padding:16px 28px;border-radius:6px;">` +
    `${escapeHtml(ctaLabel)}</a></td></tr>\n` +
    `        <tr><td align="center" style="padding:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#777777;">` +
    `<a href="${escapeHtml(options.ctaUrl)}" target="_blank" style="color:#777777;">${escapeHtml(options.ctaUrl)}</a></td></tr>`;

  // Put a CTA immediately after the first image (or first) and again at the end.
  const firstBreak = Math.min(rows.length, rows.findIndex((r) => r.includes("<img")) + 1 || 1);
  const body = [
    ...rows.slice(0, firstBreak),
    ctaRow,
    ...rows.slice(firstBreak),
    rows.length > firstBreak ? ctaRow : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding:16px 10px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;padding:20px;">
        <tr><td align="center" style="padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;font-weight:bold;color:#111111;">${escapeHtml(headline)}</td></tr>
${body}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

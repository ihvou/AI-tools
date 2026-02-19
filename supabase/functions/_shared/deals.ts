import type { DealCandidate } from "./types.ts";

const URL_REGEX = /https?:\/\/[^\s)]+/gi;
const CODE_REGEX = /\b(?:use\s+code|coupon\s+code|promo\s+code|code)\s*[:\-]?\s*["']?([A-Z0-9][A-Z0-9_-]{2,19})\b/gi;
const PERCENT_REGEX = /\b(\d{1,2})\s?%\s?off\b/gi;
const DEAL_SIGNAL_REGEX = /\b(promo|discount|save|deal|offer|coupon|affiliate|partner|special|exclusive|bonus|credit|trial extension|extended trial)\b/i;
const STRONG_DEAL_SIGNAL_REGEX =
  /\b(\d{1,2}\s?%\s?off|use\s+code|promo\s*code|coupon|discount|save\s+\$?\d+|save\s+\d{1,2}%|bonus\s+credits?|credit\s+bonus|bonus\s+package|extended\s+trial|extra\s+\d+\s+days?\s+trial|free\s+month)\b/i;
const OFFER_DETAIL_REGEX =
  /\b(\d{1,2}\s?%\s?off|use\s+code|promo\s*code|coupon|discount|save\s+\$?\d+|save\s+\d{1,2}%|bonus\s+credits?|credit\s+bonus|bonus\s+package|extended\s+trial|extra\s+\d+\s+days?\s+trial|free\s+month)\b/i;
const NON_DEAL_LINK_REGEX =
  /\b(twitter|x\.com|facebook|instagram|tiktok|linkedin|youtube|newsletter|course|courses|community|discord|telegram|patreon|website)\b/i;
const GENERIC_CTA_REGEX = /\b(start creating|try it|check it out|get started|sign up|learn more|give it a try)\b/i;
const URL_ONLY_TEXT_REGEX = /^\W*$/;

type DealExtractionContext = {
  toolName: string;
  toolSlug: string;
  toolWebsiteUrl: string | null;
};

function normalizeOfferText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripUnpairedSurrogates(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += input[i] + input[i + 1];
        i += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    out += input[i];
  }
  return out;
}

function stripUrls(input: string): string {
  return input.replace(URL_REGEX, " ");
}

function cleanOfferText(input: string): string {
  const noUrl = stripUnpairedSurrogates(stripUrls(input))
    .replace(/[▶►👉➡️]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeOfferText(noUrl);
}

function extractLines(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function safeHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeToolTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t !== "tool" && t !== "tools");
}

function looksRelevantToTool(line: string, linkUrl: string | null, context: DealExtractionContext): boolean {
  const haystack = `${line} ${linkUrl ?? ""}`.toLowerCase();
  const toolTokens = [
    ...normalizeToolTokens(context.toolName),
    ...normalizeToolTokens(context.toolSlug),
  ];
  const hasToken = toolTokens.some((token) => haystack.includes(token));
  if (hasToken) return true;

  const linkHost = safeHostname(linkUrl);
  const websiteHost = safeHostname(context.toolWebsiteUrl);
  if (linkHost && websiteHost && linkHost.includes(websiteHost)) return true;

  return false;
}

function isGenericFreeTrialCta(line: string): boolean {
  const lower = line.toLowerCase();
  const hasFreeTrial = lower.includes("free trial");
  if (!hasFreeTrial) return false;
  const hasDealSignal =
    /\b\d{1,2}\s?%\s?off\b/i.test(line) ||
    /\buse\s+code\b/i.test(line) ||
    /\bbonus\b/i.test(line) ||
    /\bcredit\b/i.test(line) ||
    /\bextended\b/i.test(line) ||
    /\bextra\b/i.test(line);
  return !hasDealSignal;
}

type ParsedLine = {
  raw: string;
  cleaned: string;
  urls: string[];
  code: string | null;
  hasPercent: boolean;
  hasDealSignal: boolean;
  hasStrongSignal: boolean;
};

function parseLine(line: string): ParsedLine {
  const urls = [...line.matchAll(URL_REGEX)].map((m) => m[0]);
  const code = [...line.matchAll(CODE_REGEX)].map((m) => m[1]?.toUpperCase()).find(Boolean) ?? null;
  const hasPercent = [...line.matchAll(PERCENT_REGEX)].length > 0;
  const hasDealSignal = DEAL_SIGNAL_REGEX.test(line) || code !== null || hasPercent;
  const hasStrongSignal = STRONG_DEAL_SIGNAL_REGEX.test(line) || code !== null || hasPercent;

  return {
    raw: line,
    cleaned: cleanOfferText(line),
    urls,
    code,
    hasPercent,
    hasDealSignal,
    hasStrongSignal,
  };
}

function nearestLine(lines: ParsedLine[], index: number, predicate: (line: ParsedLine) => boolean): ParsedLine | null {
  for (const offset of [0, -1, 1, -2, 2]) {
    const idx = index + offset;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx];
    if (predicate(line)) return line;
  }
  return null;
}

function looksGenericOfferText(text: string): boolean {
  if (!text) return true;
  if (URL_ONLY_TEXT_REGEX.test(text)) return true;
  if (text.length < 8) return true;
  if (GENERIC_CTA_REGEX.test(text) && !OFFER_DETAIL_REGEX.test(text)) return true;
  if (!OFFER_DETAIL_REGEX.test(text)) return true;
  return false;
}

function classifyOfferType(input: { code: string | null; linkUrl: string | null; offerText: string }): DealCandidate["offer_type"] {
  const text = input.offerText.toLowerCase();
  if (input.code) return "Code";
  if (/extended\s+trial|extra\s+\d+\s+days?\s+trial|\d+\s+day\s+trial/.test(text)) return "Trial extension";
  if (/credit|credits|bonus|\$\d+/.test(text)) return "Credit bonus";
  if (input.linkUrl) return "Link";
  return "Unknown";
}

export function extractDealsFromDescription(description: string, context: DealExtractionContext): DealCandidate[] {
  if (!description.trim()) return [];

  const candidates: DealCandidate[] = [];
  const seen = new Set<string>();
  const lines = extractLines(description)
    .filter((line) => !isGenericFreeTrialCta(line))
    .map(parseLine);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.urls.length === 0 && !line.code && !line.hasPercent && !line.hasDealSignal) continue;

    const nearLink = nearestLine(lines, i, (l) => l.urls.length > 0);
    const nearOffer = nearestLine(
      lines,
      i,
      (l) => l.hasStrongSignal && !looksGenericOfferText(l.cleaned),
    );
    const nearCode = nearestLine(lines, i, (l) => l.code !== null);

    const linkUrl = line.urls[0] ?? nearLink?.urls[0] ?? null;
    const code = line.code ?? nearCode?.code ?? null;

    let offerText = line.cleaned;
    if (looksGenericOfferText(offerText)) {
      offerText = nearOffer?.cleaned ?? offerText;
    }
    if (looksGenericOfferText(offerText)) {
      offerText = code ? `Use code ${code}` : "";
    }

    const offerType = classifyOfferType({ code, linkUrl, offerText });
    const hasStrongDealSignal = line.hasStrongSignal || Boolean(nearOffer?.hasStrongSignal) || code !== null;
    const hasOfferDetail = code !== null || OFFER_DETAIL_REGEX.test(offerText);

    if (offerType !== "Link" && !hasStrongDealSignal) continue;
    if (!hasOfferDetail) continue;

    const relevantToTool = looksRelevantToTool(`${line.raw} ${offerText}`, linkUrl, context);
    if (!relevantToTool) continue;

    if (
      offerType === "Link" &&
      NON_DEAL_LINK_REGEX.test(`${line.raw} ${offerText}`) &&
      !/\b(discount|promo|offer|affiliate|deal|code|coupon|save|bonus|credit)\b/i.test(`${line.raw} ${offerText}`)
    ) {
      continue;
    }
    if (offerType === "Unknown" && !/\bpromo|discount|save|deal|offer|affiliate\b/i.test(offerText)) continue;

    const key = `${offerType}|${code ?? ""}|${linkUrl ?? ""}|${offerText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({
      offer_text: offerText,
      offer_type: offerType,
      code,
      link_url: linkUrl,
    });
  }

  return candidates;
}

export function normalizeTextForMatch(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_YT_WEB_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const REVIEW_TAGS = [
  "UI/UX",
  "Output quality",
  "Relevance",
  "Speed",
  "Pricing",
  "Cancellation/Refund",
  "Limits",
  "Integrations",
  "Watermark",
  "Export quality",
  "Support",
  "Reliability",
  "Other",
];
const STRONG_DEAL_SIGNAL_REGEX =
  /\b(\d{1,2}\s?%\s?off|use\s+code|promo\s*code|coupon|discount|save\s+\$?\d+|save\s+\d{1,2}%|bonus\s+credits?|credit\s+bonus|bonus\s+package|extended\s+trial|extra\s+\d+\s+days?\s+trial|free\s+month)\b/i;
const OFFER_DETAIL_REGEX =
  /\b(\d{1,2}\s?%\s?off|use\s+code|promo\s*code|coupon|discount|save\s+\$?\d+|save\s+\d{1,2}%|bonus\s+credits?|credit\s+bonus|bonus\s+package|extended\s+trial|extra\s+\d+\s+days?\s+trial|free\s+month)\b/i;
const CODE_CAPTURE_REGEX = /\b(?:use\s+code|coupon\s+code|promo\s+code|code)\s*[:\-]?\s*["']?([A-Z0-9][A-Z0-9_-]{2,19})\b/i;
const GENERIC_CTA_REGEX = /\b(start creating|try it|check it out|get started|sign up|learn more|give it a try|give a chance)\b/i;
const WEAK_REVIEW_REGEX =
  /\b(promises?|maybe|might|could|hopefully|probably|i\s+think|i\s+guess|we'?ll\s+see|let'?s\s+see|ridiculously\s+easy|amazing)\b/i;
const PLANNING_REVIEW_REGEX =
  /\b(i[' ]?m going to|i will|i[' ]?ll|today we|in this video|first, it'?s important to note|i'm going to break down)\b/i;
const CONCRETE_CLAIM_TOPIC_REGEX =
  /\b(price|pricing|cost|expensive|cheap|credit|trial|refund|cancel|limit|slow|fast|quality|resolution|watermark|bug|crash|reliable|support|export|integrat|template|voiceover|render|latency)\b/i;
const CONCRETE_CLAIM_VERB_REGEX =
  /\b(is|are|has|have|does|doesn'?t|can|can'?t|cannot|takes|costs|supports|lacks|fails|works|does not)\b/i;
const COMPETITOR_REVIEW_REGEX = /\b(freepik|freepick|openart|sora|kling|veo|runway|pika|capcut|premiere|adobe|midjourney)\b/i;
const TRAILING_FRAGMENT_REVIEW_REGEX = /\b(and|or|but|with|to|for|of|in|on|at|as|like|about|upbeat)\s*$/i;

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

async function loadEnv() {
  let fileEnv = {};
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    fileEnv = parseEnv(raw);
  } catch {
    // .env.local is optional in CI where env vars are injected by runner.
  }
  return { ...fileEnv, ...process.env };
}

class Rest {
  constructor(baseUrl, serviceKey) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.serviceKey = serviceKey;
  }

  async req(method, endpoint, { query, body, prefer } = {}) {
    const url = new URL(`${this.baseUrl}/rest/v1/${endpoint}`);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const headers = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
    };
    if (prefer) headers.Prefer = prefer;
    const safeBody = body ? sanitizeJsonValue(body) : undefined;
    const res = await fetch(url, { method, headers, body: safeBody ? JSON.stringify(safeBody) : undefined });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${endpoint} ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }

  get(endpoint, query) { return this.req("GET", endpoint, { query }); }
  post(endpoint, body, query, prefer = "return=representation") {
    return this.req("POST", endpoint, { body, query, prefer });
  }
  patch(endpoint, body, query, prefer = "return=representation") {
    return this.req("PATCH", endpoint, { body, query, prefer });
  }
  delete(endpoint, query, prefer = "return=minimal") {
    return this.req("DELETE", endpoint, { query, prefer });
  }
}

function decodeEntities(input) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function stripUnpairedSurrogates(input) {
  const text = String(input || "");
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        out += text[i] + text[i + 1];
        i += 1;
      }
      continue;
    }
    if (code >= 0xDC00 && code <= 0xDFFF) continue;
    out += text[i];
  }
  return out;
}

function sanitizeStringForJson(input) {
  return stripUnpairedSurrogates(String(input || ""))
    .replace(/\\u[dD][89abAB][0-9a-fA-F]{2}/g, "")
    .replace(/\\u[dD][cdefCDEF][0-9a-fA-F]{2}/g, "");
}

function sanitizeJsonValue(value) {
  if (typeof value === "string") return sanitizeStringForJson(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeJsonValue(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeJsonValue(v)]),
    );
  }
  return value;
}

function normalizeText(input) {
  return stripUnpairedSurrogates(decodeEntities(String(input || ""))).replace(/\s+/g, " ").trim();
}

function parseJsonTimedtext(text) {
  try {
    const payload = JSON.parse(text);
    const events = Array.isArray(payload.events) ? payload.events : [];
    return events
      .map((e) => ({
        start: Math.max(0, Math.floor(Number(e.tStartMs || 0) / 1000)),
        duration: Math.max(1, Math.floor(Number(e.dDurationMs || 1000) / 1000)),
        text: normalizeText((Array.isArray(e.segs) ? e.segs : []).map((s) => s?.utf8 || "").join("")),
      }))
      .filter((s) => s.text);
  } catch {
    return [];
  }
}

function parseXmlTimedtext(text) {
  const out = [];
  const regex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  for (const match of text.matchAll(regex)) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const t = Number.parseInt(attrs.match(/\bt="(\d+)"/)?.[1] || "0", 10);
    const d = Number.parseInt(attrs.match(/\bd="(\d+)"/)?.[1] || "1000", 10);
    const plain = body
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<\/?s\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ");
    const normalized = normalizeText(plain);
    if (!normalized) continue;
    out.push({
      start: Math.max(0, Math.floor((Number.isFinite(t) ? t : 0) / 1000)),
      duration: Math.max(1, Math.floor((Number.isFinite(d) ? d : 1000) / 1000)),
      text: normalized,
    });
  }
  return out;
}

function parseTimedtextBody(text, contentType) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  if ((contentType || "").includes("json") || trimmed.startsWith("{")) {
    const parsed = parseJsonTimedtext(trimmed);
    if (parsed.length > 0) return parsed;
  }
  if ((contentType || "").includes("xml") || trimmed.startsWith("<")) {
    const parsed = parseXmlTimedtext(trimmed);
    if (parsed.length > 0) return parsed;
  }
  const fromJson = parseJsonTimedtext(trimmed);
  if (fromJson.length > 0) return fromJson;
  return parseXmlTimedtext(trimmed);
}

function parseCaptionTracksFromHtml(html) {
  const direct = html.match(/"captions":(\{.*?\}),"videoDetails"/s)?.[1] || null;
  if (!direct) return [];
  try {
    const captions = JSON.parse(direct);
    return (captions?.playerCaptionsTracklistRenderer?.captionTracks || [])
      .map((t) => ({ baseUrl: t?.baseUrl || "", languageCode: t?.languageCode || "" }))
      .filter((t) => t.baseUrl);
  } catch {
    return [];
  }
}

async function fetchWatchContext(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || null;
    return {
      apiKey,
      tracks: parseCaptionTracksFromHtml(html),
    };
  } catch {
    return null;
  }
}

async function fetchTrackSegments(videoId, baseUrl) {
  const urls = baseUrl.includes("fmt=")
    ? [baseUrl]
    : [`${baseUrl}&fmt=json3`, `${baseUrl}&fmt=srv3`, baseUrl];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": `https://www.youtube.com/watch?v=${videoId}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const parsed = parseTimedtextBody(text, res.headers.get("content-type"));
      if (parsed.length > 0) return parsed;
    } catch {
      // try next variant
    }
  }

  return [];
}

async function fetchPlayerTracks(videoId, apiKeys) {
  const keys = [...new Set(apiKeys.filter(Boolean))];
  const clients = [
    {
      clientName: "IOS",
      clientVersion: "19.45.4",
      deviceModel: "iPhone14,3",
      hl: "en",
      gl: "US",
    },
    {
      clientName: "ANDROID",
      clientVersion: "19.44.38",
      androidSdkVersion: 30,
      hl: "en",
      gl: "US",
      utcOffsetMinutes: 0,
    },
  ];

  for (const apiKey of keys) {
    const endpoint = new URL("https://www.youtube.com/youtubei/v1/player");
    endpoint.searchParams.set("prettyPrint", "false");
    endpoint.searchParams.set("key", apiKey);

    for (const client of clients) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://www.youtube.com",
            "Referer": `https://www.youtube.com/watch?v=${videoId}`,
          },
          body: JSON.stringify({
            context: { client },
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const payload = await res.json();
        if (payload?.playabilityStatus?.status !== "OK") continue;
        const tracks = payload?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (tracks.length > 0) return tracks.map((t) => ({ baseUrl: t.baseUrl || "", languageCode: t.languageCode || "" }));
      } catch {
        // try next client
      }
    }
  }

  return [];
}

async function fetchTranscript(videoId) {
  const context = await fetchWatchContext(videoId);

  const watchTracks = context?.tracks || [];
  const orderedWatch = [
    ...watchTracks.filter((t) => String(t.languageCode || "").startsWith("en")),
    ...watchTracks.filter((t) => !String(t.languageCode || "").startsWith("en")),
  ];
  for (const track of orderedWatch) {
    const segments = await fetchTrackSegments(videoId, track.baseUrl);
    if (segments.length > 0) return segments;
  }

  const playerTracks = await fetchPlayerTracks(videoId, [context?.apiKey, DEFAULT_YT_WEB_API_KEY]);
  const orderedPlayer = [
    ...playerTracks.filter((t) => String(t.languageCode || "").startsWith("en")),
    ...playerTracks.filter((t) => !String(t.languageCode || "").startsWith("en")),
  ];
  for (const track of orderedPlayer) {
    const segments = await fetchTrackSegments(videoId, track.baseUrl);
    if (segments.length > 0) return segments;
  }

  return [];
}

function normalizeCachedTranscriptSegments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      start: Math.max(0, Math.floor(Number(item?.startSeconds || 0))),
      duration: Math.max(1, Math.floor(Number(item?.durationSeconds || 1))),
      text: normalizeText(item?.text || ""),
    }))
    .filter((seg) => seg.text);
}

function transcriptTextFromSegments(segments) {
  return segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
}

function normalizeToolTokens(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t !== "tool" && t !== "tools");
}

function safeHostname(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function looksRelevantToTool(line, linkUrl, context) {
  const haystack = `${line} ${linkUrl || ""}`.toLowerCase();
  const tokens = [...normalizeToolTokens(context.toolName), ...normalizeToolTokens(context.toolSlug)];
  if (tokens.some((token) => haystack.includes(token))) return true;

  const linkHost = safeHostname(linkUrl);
  const websiteHost = safeHostname(context.toolWebsiteUrl);
  if (linkHost && websiteHost && linkHost.includes(websiteHost)) return true;
  return false;
}

function isGenericFreeTrialCta(line) {
  const lower = line.toLowerCase();
  if (!lower.includes("free trial")) return false;
  const hasDealSignal =
    /\b\d{1,2}\s?%\s?off\b/i.test(line) ||
    /\buse\s+code\b/i.test(line) ||
    /\bbonus\b/i.test(line) ||
    /\bcredit\b/i.test(line) ||
    /\bextended\b/i.test(line) ||
    /\bextra\b/i.test(line);
  return !hasDealSignal;
}

function stripUrls(input) {
  return String(input || "").replace(/https?:\/\/[^\s)]+/gi, " ");
}

function cleanOfferText(input) {
  return stripUnpairedSurrogates(stripUrls(input))
    .replace(/[▶►👉➡️]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDealLine(rawLine) {
  const urls = [...rawLine.matchAll(/https?:\/\/[^\s)]+/gi)].map((m) => m[0]);
  const code = rawLine.match(CODE_CAPTURE_REGEX)?.[1]?.toUpperCase() ?? null;
  const hasPercent = /\b\d{1,2}\s?%\s?off\b/i.test(rawLine);
  const hasDealSignal =
    /\b(promo|discount|save|deal|offer|coupon|affiliate|partner|special|exclusive|bonus|credit)\b/i.test(rawLine) ||
    code !== null ||
    hasPercent;
  const hasStrongSignal = STRONG_DEAL_SIGNAL_REGEX.test(rawLine) || code !== null || hasPercent;

  return {
    raw: rawLine,
    cleaned: cleanOfferText(rawLine),
    urls,
    code,
    hasPercent,
    hasDealSignal,
    hasStrongSignal,
  };
}

function nearestDealLine(lines, index, predicate) {
  for (const offset of [0, -1, 1, -2, 2]) {
    const idx = index + offset;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx];
    if (predicate(line)) return line;
  }
  return null;
}

function looksGenericOfferText(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  if (value.length < 8) return true;
  if (GENERIC_CTA_REGEX.test(value) && !OFFER_DETAIL_REGEX.test(value)) return true;
  if (!OFFER_DETAIL_REGEX.test(value)) return true;
  return false;
}

function parseDeals(description, context) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => !isGenericFreeTrialCta(line))
    .map(parseDealLine);
  const out = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.urls.length === 0 && !line.code && !line.hasPercent && !line.hasDealSignal) continue;

    const nearLink = nearestDealLine(lines, i, (l) => l.urls.length > 0);
    const nearOffer = nearestDealLine(lines, i, (l) => l.hasStrongSignal && !looksGenericOfferText(l.cleaned));
    const nearCode = nearestDealLine(lines, i, (l) => l.code !== null);

    const linkUrl = line.urls[0] || nearLink?.urls[0] || null;
    const code = line.code || nearCode?.code || null;

    let offerText = line.cleaned;
    if (looksGenericOfferText(offerText)) {
      offerText = nearOffer?.cleaned || offerText;
    }
    if (looksGenericOfferText(offerText)) {
      offerText = code ? `Use code ${code}` : "";
    }

    const hasStrongDealSignal = line.hasStrongSignal || Boolean(nearOffer?.hasStrongSignal) || code !== null;

    let offerType = "Unknown";
    if (code) offerType = "Code";
    else if (/extended\s+trial|extra\s+\d+\s+day/i.test(`${line.raw} ${offerText}`)) offerType = "Trial extension";
    else if (/credit|bonus|\$\d+/i.test(`${line.raw} ${offerText}`)) offerType = "Credit bonus";
    else if (linkUrl) offerType = "Link";

    if (offerType !== "Link" && !hasStrongDealSignal) continue;

    const relevantToTool = looksRelevantToTool(`${line.raw} ${offerText}`, linkUrl, context);
    if (!relevantToTool) continue;

    if (
      offerType === "Link" &&
      /\b(twitter|x\.com|facebook|instagram|tiktok|linkedin|youtube|newsletter|course|courses|community|discord|telegram|patreon|website)\b/i
        .test(`${line.raw} ${offerText}`) &&
      !/\b(discount|promo|offer|affiliate|deal|code|coupon|save|bonus|credit)\b/i.test(`${line.raw} ${offerText}`)
    ) {
      continue;
    }

    const key = `${offerType}|${code || ""}|${linkUrl || ""}|${offerText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ offer_text: offerText, offer_type: offerType, code, link_url: linkUrl });
  }

  return out;
}

function classifyOfferType({ code, linkUrl, offerText }) {
  const text = String(offerText || "").toLowerCase();
  if (code) return "Code";
  if (/extended\s+trial|extra\s+\d+\s+days?\s+trial|\d+\s+day\s+trial/.test(text)) return "Trial extension";
  if (/credit|credits|bonus|\$\d+/.test(text)) return "Credit bonus";
  if (linkUrl) return "Link";
  return "Unknown";
}

function extractTranscriptDealHint(segments, aliases) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const lowerAliases = aliases.map((a) => a.toLowerCase());

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const text = normalizeText(segment.text || "");
    if (!text) continue;

    const hasDealTerm = OFFER_DETAIL_REGEX.test(text) || CODE_CAPTURE_REGEX.test(text);
    if (!hasDealTerm) continue;

    const vicinity = segments
      .slice(Math.max(0, i - 3), Math.min(segments.length, i + 4))
      .map((s) => String(s.text || "").toLowerCase())
      .join(" ");
    if (!lowerAliases.some((alias) => vicinity.includes(alias))) continue;

    const code = text.match(CODE_CAPTURE_REGEX)?.[1]?.toUpperCase() ?? null;
    const cleaned = cleanOfferText(text);
    if (!cleaned) continue;

    return {
      offer_text: cleaned,
      code,
      offer_type: classifyOfferType({ code, linkUrl: null, offerText: cleaned }),
      transcript_timestamp_seconds: Math.max(0, Math.floor(Number(segment.start || 0))),
    };
  }

  return null;
}

function enrichDealsWithTranscript(candidates, transcriptHint) {
  if (!transcriptHint) return candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [
      {
        offer_text: transcriptHint.offer_text,
        offer_type: transcriptHint.offer_type,
        code: transcriptHint.code,
        link_url: null,
        transcript_timestamp_seconds: transcriptHint.transcript_timestamp_seconds,
      },
    ];
  }

  return candidates.map((candidate) => {
    const generic = looksGenericOfferText(candidate.offer_text);
    if (!generic) return candidate;

    const mergedCode = candidate.code || transcriptHint.code || null;
    return {
      ...candidate,
      offer_text: transcriptHint.offer_text,
      code: mergedCode,
      offer_type: classifyOfferType({
        code: mergedCode,
        linkUrl: candidate.link_url,
        offerText: transcriptHint.offer_text,
      }),
      transcript_timestamp_seconds: transcriptHint.transcript_timestamp_seconds,
    };
  });
}

function buildToolAliases(tool) {
  const aliases = new Set();
  aliases.add(String(tool.name || "").toLowerCase());
  aliases.add(String(tool.slug || "").toLowerCase().replace(/-/g, " "));
  for (const token of normalizeToolTokens(tool.name)) aliases.add(token);
  for (const token of normalizeToolTokens(tool.slug)) aliases.add(token);
  return [...aliases].filter((a) => a.length >= 3);
}

function mergeMentionWindows(segments, aliases) {
  const windows = [];

  for (const segment of segments) {
    const lowerText = segment.text.toLowerCase();
    if (!aliases.some((alias) => lowerText.includes(alias))) continue;
    const start = Math.max(0, segment.start - 20);
    const end = start + 50;
    const text = segments
      .filter((s) => s.start >= start && s.start <= end)
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    windows.push({ start, end, text });
  }

  windows.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const win of windows) {
    const prev = merged[merged.length - 1];
    if (!prev || win.start > prev.end - 10) {
      merged.push(win);
      continue;
    }
    prev.end = Math.max(prev.end, win.end);
    prev.text = `${prev.text} ${win.text}`.replace(/\s+/g, " ").trim();
  }

  return merged;
}

function decisionSignalScore(text) {
  const lower = String(text || "").toLowerCase();
  let score = 0;
  if (CONCRETE_CLAIM_TOPIC_REGEX.test(lower)) score += 3;
  if (CONCRETE_CLAIM_VERB_REGEX.test(lower)) score += 2;
  if (/\b\d+%|\$\d+|\b\d+\s*(minute|minutes|sec|seconds)\b/.test(lower)) score += 2;
  if (PLANNING_REVIEW_REGEX.test(lower)) score -= 2;
  if (WEAK_REVIEW_REGEX.test(lower)) score -= 2;
  return score;
}

function fallbackReviewWindows(segments, count = 1) {
  if (!Array.isArray(segments) || segments.length === 0 || count <= 0) return [];
  const windowSeconds = 50;
  const lastStart = Math.max(0, Number(segments[segments.length - 1]?.start || 0) - windowSeconds);
  const step = 30;
  const candidates = [];

  for (let start = 0; start <= lastStart; start += step) {
    const end = start + windowSeconds;
    const text = segments
      .filter((seg) => seg.start >= start && seg.start <= end)
      .map((seg) => seg.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const score = decisionSignalScore(text);
    if (score < 2) continue;
    candidates.push({ start, end, text, score });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.start - b.start;
  });

  const picked = [];
  for (const c of candidates) {
    if (picked.length >= count) break;
    if (picked.some((prev) => c.start <= prev.end - 12)) continue;
    picked.push({ start: c.start, end: c.end, text: c.text });
  }
  return picked;
}

function normalizeForVerbatimCheck(text) {
  return normalizeText(text).toLowerCase();
}

function isVerbatimish(windowText, quote) {
  const w = normalizeForVerbatimCheck(windowText);
  const q = normalizeForVerbatimCheck(quote);
  if (!q || q.length < 25) return false;
  if (w.includes(q)) return true;
  return w.replace(/[^\w\s]/g, "").includes(q.replace(/[^\w\s]/g, ""));
}

function isUsefulReviewQuote(quoteText, toolName, transcriptWindow = "") {
  const quote = normalizeText(quoteText);
  if (!quote || quote.length < 35) return false;
  if (quote.split(/\s+/).length < 9) return false;
  if (TRAILING_FRAGMENT_REVIEW_REGEX.test(quote)) return false;
  if (/\?\s*$/.test(quote)) return false;
  if (WEAK_REVIEW_REGEX.test(quote)) return false;

  const lowerTool = String(toolName || "").toLowerCase();
  const lowerQuote = quote.toLowerCase();
  const lowerWindow = normalizeText(transcriptWindow).toLowerCase();
  const toolToken = lowerTool.split(" ")[0] || "";
  const hasToolContext = Boolean(toolToken) && (lowerQuote.includes(toolToken) || lowerWindow.includes(toolToken));
  if (COMPETITOR_REVIEW_REGEX.test(lowerQuote) && toolToken && !lowerQuote.includes(toolToken)) return false;

  if (lowerTool && !quote.toLowerCase().includes(lowerTool.split(" ")[0])) {
    // Require at least one concrete topic when tool name isn't explicitly repeated.
    if (!CONCRETE_CLAIM_TOPIC_REGEX.test(quote)) return false;
  }

  if (!CONCRETE_CLAIM_TOPIC_REGEX.test(quote)) return false;
  if (!CONCRETE_CLAIM_VERB_REGEX.test(quote)) return false;
  return true;
}

function inferSentiment(text) {
  const lower = String(text || "").toLowerCase();
  const negative = /\b(expensive|slow|issue|problem|limited|lacks|fails|bug|no money-back|refund)\b/.test(lower);
  const positive = /\b(good|great|fast|easy|reliable|works well|high quality|better)\b/.test(lower);
  if (negative && !positive) return "Con";
  if (positive && !negative) return "Pro";
  return "Neutral";
}

function inferTopics(text) {
  const lower = String(text || "").toLowerCase();
  const topics = [];
  if (/price|pricing|cost|expensive|cheap|credit/.test(lower)) topics.push("Pricing");
  if (/cancel|refund|money-back|billing/.test(lower)) topics.push("Cancellation/Refund");
  if (/limit|quota|restriction|cap/.test(lower)) topics.push("Limits");
  if (/speed|fast|slow|latency/.test(lower)) topics.push("Speed");
  if (/quality|output|result|render|resolution/.test(lower)) topics.push("Output quality");
  if (/support|help|ticket/.test(lower)) topics.push("Support");
  if (/bug|crash|stable|reliable|downtime/.test(lower)) topics.push("Reliability");
  return topics.length ? topics.slice(0, 4) : ["Other"];
}

function deterministicExtractReview(windowText, toolName, aliases) {
  const sentences = normalizeText(windowText)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (sentence.length < 35 || sentence.length > 260) continue;
    if (/\?\s*$/.test(sentence)) continue;
    if (WEAK_REVIEW_REGEX.test(sentence)) continue;
    if (PLANNING_REVIEW_REGEX.test(sentence)) continue;
    if (!CONCRETE_CLAIM_TOPIC_REGEX.test(sentence)) continue;
    if (!CONCRETE_CLAIM_VERB_REGEX.test(sentence)) continue;

    const lower = sentence.toLowerCase();
    const hasAlias = aliases.some((alias) => lower.includes(alias));
    const hasToolToken = lower.includes(String(toolName || "").toLowerCase().split(" ")[0] || "");
    if (!hasAlias && !hasToolToken && !CONCRETE_CLAIM_TOPIC_REGEX.test(sentence)) continue;

    return {
      quote_text: sentence,
      sentiment: inferSentiment(sentence),
      topics: inferTopics(sentence),
      sponsored_flag: /\b(sponsor|sponsored|affiliate|partner)\b/i.test(sentence),
      confidence: 0.58,
    };
  }

  return null;
}

async function llmExtractReview(openAiApiKey, modelName, toolName, transcriptWindow) {
  if (!openAiApiKey) return null;

  const schema = {
    name: "review_extraction",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        quote_text: { type: "string" },
        sentiment: { type: "string", enum: ["Pro", "Con", "Neutral"] },
        topics: {
          type: "array",
          items: { type: "string", enum: REVIEW_TAGS },
          maxItems: 4,
        },
        sponsored_flag: { type: "boolean" },
        confidence: { type: "number" },
      },
      required: ["quote_text", "sentiment", "topics", "sponsored_flag", "confidence"],
    },
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages: [
        {
          role: "system",
          content:
            "Extract a single verbatim quote only if it is clearly about the target tool and helps a user decide fit, risks, or tradeoffs. Return empty quote_text otherwise.",
        },
        {
          role: "user",
          content: [
            `Tool: ${toolName}`,
            "",
            "Transcript window:",
            transcriptWindow,
            "",
            "Rules:",
            "- Quote must be verbatim and decision-relevant.",
            "- Reject quotes about competitor tools, even if useful in general.",
            "- Accept concrete claims on capability, quality, speed, pricing, limits, reliability, workflow effort, or edit control.",
            "- Reject narration, hype, predictions, vague praise, setup language, and generic statements.",
            "- If evidence is weak, return empty quote_text.",
            "- Allow up to 3 sentences when the thought is cohesive and still concrete.",
            "- sponsored_flag true only with explicit sponsorship/affiliate context.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "";
  if (!content) return null;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const block = content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content.match(/```([\s\S]*?)```/)?.[1] ?? null;
    if (!block) return null;
    parsed = JSON.parse(block);
  }

  const quoteText = normalizeText(parsed?.quote_text || "");
  if (!quoteText) return null;
  if (!isVerbatimish(transcriptWindow, quoteText)) return null;
  if (!isUsefulReviewQuote(quoteText, toolName, transcriptWindow)) return null;

  const confidence = Number(parsed?.confidence);
  const sentiment = ["Pro", "Con", "Neutral"].includes(parsed?.sentiment) ? parsed.sentiment : "Neutral";
  const topics = Array.isArray(parsed?.topics)
    ? parsed.topics.filter((t) => REVIEW_TAGS.includes(t)).slice(0, 4)
    : [];

  return {
    quote_text: quoteText,
    sentiment,
    topics: topics.length > 0 ? topics : ["Other"],
    sponsored_flag: Boolean(parsed?.sponsored_flag),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.6,
  };
}

function inFilter(ids) {
  return `in.(${ids.join(",")})`;
}

async function main() {
  const toolSlug = process.argv[2] || "invideo-ai";
  const dryRun = process.argv.includes("--dry-run");
  const resetReviews = process.argv.includes("--reset-reviews");
  const transcriptCacheOnly = process.argv.includes("--transcript-cache-only");
  const skipDeals = transcriptCacheOnly || process.argv.includes("--skip-deals");
  const skipReviews = transcriptCacheOnly || process.argv.includes("--skip-reviews");
  const allowHeuristicFallback = process.argv.includes("--allow-heuristic-fallback");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const modelArg = process.argv.find((arg) => arg.startsWith("--model="));
  const minConfidenceArg = process.argv.find((arg) => arg.startsWith("--min-confidence="));
  const maxVideos = Math.max(1, Number.parseInt(limitArg?.split("=")[1] || "5", 10) || 5);

  const env = await loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const openAiApiKey = env.OPENAI_API_KEY || "";
  if (!baseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  }
  const db = new Rest(baseUrl, serviceKey);
  const reviewModel = modelArg?.split("=")[1] || env.PIPELINE_REVIEW_MODEL || "gpt-4.1-mini";
  const parsedMinConfidence = Number.parseFloat(minConfidenceArg?.split("=")[1] || env.PIPELINE_MIN_CONFIDENCE || "0.45");
  const minConfidence = Number.isFinite(parsedMinConfidence) ? Math.max(0, Math.min(1, parsedMinConfidence)) : 0.45;

  const tools = await db.get("tools", {
    select: "id,slug,name,website_url",
    slug: `eq.${toolSlug}`,
    limit: "1",
  });
  if (!tools.length) throw new Error(`Tool not found: ${toolSlug}`);
  const tool = tools[0];

  const mentions = await db.get("video_mentions", {
    select: "video_id",
    tool_id: `eq.${tool.id}`,
    limit: "2000",
  });
  const mentionIds = [...new Set(mentions.map((m) => m.video_id))];
  if (!mentionIds.length) throw new Error(`No video_mentions for ${tool.slug}`);

  const videos = await db.get("youtube_videos", {
    select: "id,youtube_video_id,title,description,video_url,published_at",
    id: inFilter(mentionIds),
    order: "published_at.desc",
    limit: String(Math.max(maxVideos * 3, 20)),
  });

  const realVideos = videos
    .filter((v) => !String(v.youtube_video_id || "").startsWith("seed-"))
    .slice(0, maxVideos);
  const realVideoIds = realVideos.map((video) => video.id);
  const cachedTranscriptRows = realVideoIds.length
    ? await db.get("video_transcripts", {
      select: "video_id,segments_json",
      video_id: inFilter(realVideoIds),
      limit: "10000",
    })
    : [];
  const cachedByVideoId = new Map(cachedTranscriptRows.map((row) => [row.video_id, row]));

  if (resetReviews && !dryRun) {
    await db.delete("review_snippets", { tool_id: `eq.${tool.id}` });
  }

  const categoryRows = await db.get("tool_categories", {
    select: "categories(name)",
    tool_id: `eq.${tool.id}`,
    limit: "30",
  });
  const categories = [...new Set(categoryRows.map((r) => r.categories?.name).filter(Boolean))];

  let dealsUpserted = 0;
  let reviewsInserted = 0;
  let transcriptMisses = 0;
  let transcriptOk = 0;
  let videosProcessed = 0;
  const transcriptFailedVideoIds = [];

  for (const video of realVideos) {
    videosProcessed += 1;

    const nowIso = new Date().toISOString();

    let segments = normalizeCachedTranscriptSegments(cachedByVideoId.get(video.id)?.segments_json);
    if (!segments.length) {
      segments = await fetchTranscript(video.youtube_video_id);
      if (!dryRun && segments.length) {
        await db.post(
          "video_transcripts",
          {
            video_id: video.id,
            youtube_video_id: video.youtube_video_id,
            transcript_text: transcriptTextFromSegments(segments),
            segments_json: segments.map((seg) => ({
              startSeconds: seg.start,
              durationSeconds: seg.duration,
              text: seg.text,
            })),
            source: "youtube_scrape",
            fetched_at: nowIso,
            updated_at: nowIso,
          },
          { on_conflict: "video_id" },
          "resolution=merge-duplicates,return=minimal",
        );
      }
    }
    if (transcriptCacheOnly) {
      if (!segments.length) {
        transcriptMisses += 1;
        transcriptFailedVideoIds.push(video.youtube_video_id);
      } else {
        transcriptOk += 1;
      }
      continue;
    }
    const aliases = buildToolAliases(tool);
    if (!skipDeals) {
      let dealCandidates = parseDeals(video.description || "", {
        toolName: tool.name,
        toolSlug: tool.slug,
        toolWebsiteUrl: tool.website_url || null,
      });
      if (segments.length > 0) {
        const transcriptHint = extractTranscriptDealHint(segments, aliases);
        dealCandidates = enrichDealsWithTranscript(dealCandidates, transcriptHint);
      }
      dealCandidates = dealCandidates.filter((candidate) =>
        Boolean(candidate.code) || OFFER_DETAIL_REGEX.test(String(candidate.offer_text || ""))
      );

      for (const candidate of dealCandidates) {
        if (dryRun) {
          dealsUpserted += 1;
          continue;
        }

        let existing = [];
        if (candidate.code) {
          existing = await db.get("deals", {
            select: "id",
            tool_id: `eq.${tool.id}`,
            code: `eq.${candidate.code}`,
            limit: "1",
          });
          if (!existing.length && candidate.link_url) {
            existing = await db.get("deals", {
              select: "id",
              tool_id: `eq.${tool.id}`,
              link_url: `eq.${candidate.link_url}`,
              limit: "1",
            });
          }
        } else if (candidate.link_url) {
          existing = await db.get("deals", {
            select: "id",
            tool_id: `eq.${tool.id}`,
            link_url: `eq.${candidate.link_url}`,
            limit: "1",
          });
        }

        const receiptBase = video.video_url || `https://www.youtube.com/watch?v=${video.youtube_video_id}`;
        const ts = Number.isFinite(candidate.transcript_timestamp_seconds)
          ? Math.max(0, Math.floor(candidate.transcript_timestamp_seconds))
          : null;

        const payload = {
          tool_id: tool.id,
          video_id: video.id,
          offer_text: candidate.offer_text,
          offer_type: candidate.offer_type,
          code: candidate.code,
          link_url: candidate.link_url,
          category: categories,
          receipt_url: ts !== null ? `${receiptBase}&t=${ts}s` : receiptBase,
          receipt_timestamp_seconds: ts,
          source: ts !== null ? "transcript" : "description",
          last_seen: nowIso,
          active: true,
        };
        try {
          if (existing.length) {
            await db.patch("deals", payload, { id: `eq.${existing[0].id}` }, "return=minimal");
          } else {
            await db.post("deals", payload, undefined, "return=minimal");
          }
        } catch (error) {
          console.error("Deal upsert failed", {
            video_id: video.youtube_video_id,
            candidate,
            payload,
          });
          throw error;
        }
        dealsUpserted += 1;
      }
    }

    if (!segments.length) {
      transcriptMisses += 1;
      transcriptFailedVideoIds.push(video.youtube_video_id);
      if (!dryRun && !skipReviews) {
        await db.patch(
          "youtube_videos",
          { processed_at: nowIso, transcript_status: "missing" },
          { id: `eq.${video.id}` },
          "return=minimal",
        );
      }
      continue;
    }
    transcriptOk += 1;

    if (!skipReviews) {
      const mentionWindows = mergeMentionWindows(segments, aliases).slice(0, 3);
      const windows = mentionWindows.length > 0
        ? mentionWindows
        : fallbackReviewWindows(segments, 1);
      for (const win of windows) {
        const windowText = win.text.slice(0, 850).trim();
        if (!windowText) continue;

        let extraction = null;
        if (openAiApiKey) {
          try {
            extraction = await llmExtractReview(openAiApiKey, reviewModel, tool.name, windowText);
          } catch {
            extraction = null;
          }
        }
        if (!extraction && allowHeuristicFallback) {
          extraction = deterministicExtractReview(windowText, tool.name, aliases);
        }

        if (!extraction) {
          continue;
        }
        if (extraction.confidence < minConfidence) continue;

        const timestamp = Math.max(0, Math.floor(win.start));
        const low = Math.max(0, timestamp - 5);
        const high = timestamp + 5;

        const existing = await db.get("review_snippets", {
          select: "id,extraction_confidence",
          tool_id: `eq.${tool.id}`,
          video_id: `eq.${video.id}`,
          and: `(receipt_timestamp_seconds.gte.${low},receipt_timestamp_seconds.lte.${high})`,
          limit: "1",
        });

        if (existing.length > 0) {
          const prevConfidence = Number(existing[0].extraction_confidence || 0);
          if (!dryRun && extraction.confidence > prevConfidence) {
            await db.patch(
              "review_snippets",
              {
                sentiment: extraction.sentiment,
                tags: extraction.topics,
                snippet_text: extraction.quote_text,
                raw_snippet_text: extraction.quote_text,
                sponsored_flag: extraction.sponsored_flag,
                extraction_confidence: extraction.confidence,
              },
              { id: `eq.${existing[0].id}` },
              "return=minimal",
            );
          }
          continue;
        }

        if (!dryRun) {
          await db.post(
            "review_snippets",
            {
              tool_id: tool.id,
              video_id: video.id,
              sentiment: extraction.sentiment,
              tags: extraction.topics,
              snippet_text: extraction.quote_text,
              raw_snippet_text: extraction.quote_text,
              video_title: video.title,
              channel_name: null,
              publish_date: video.published_at ? video.published_at.slice(0, 10) : null,
              receipt_timestamp_seconds: timestamp,
              receipt_url: `${video.video_url || `https://www.youtube.com/watch?v=${video.youtube_video_id}`}&t=${timestamp}s`,
              sponsored_flag: extraction.sponsored_flag,
              extraction_confidence: extraction.confidence,
            },
            undefined,
            "return=minimal",
          );
        }
        reviewsInserted += 1;
      }
    }

    if (!dryRun && !skipReviews) {
      await db.patch(
        "youtube_videos",
        { processed_at: nowIso, transcript_status: "ok" },
        { id: `eq.${video.id}` },
        "return=minimal",
      );
    }
  }

  const allReviews = skipReviews
    ? []
    : await db.get("review_snippets", {
      select: "id,publish_date",
      tool_id: `eq.${tool.id}`,
      limit: "10000",
    });
  const lastSeen = allReviews
    .map((r) => r.publish_date)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  if (!dryRun && !skipReviews) {
    await db.patch(
      "tools",
      {
        review_sources_count: allReviews.length,
        last_seen_review_date: lastSeen,
      },
      { id: `eq.${tool.id}` },
      "return=minimal",
    );
  }

  console.log(JSON.stringify({
    tool: { slug: tool.slug, name: tool.name, id: tool.id },
    openai_enabled: Boolean(openAiApiKey),
    review_model: reviewModel,
    min_confidence: minConfidence,
    transcript_cache_only: transcriptCacheOnly,
    skip_deals: skipDeals,
    skip_reviews: skipReviews,
    heuristic_fallback_enabled: allowHeuristicFallback,
    videos_considered: realVideos.length,
    videos_processed: videosProcessed,
    transcript_ok: transcriptOk,
    transcript_misses: transcriptMisses,
    transcript_failed_video_ids: transcriptFailedVideoIds,
    deals_upserted: dealsUpserted,
    reviews_inserted: reviewsInserted,
    final_review_count_for_tool: allReviews.length,
    dry_run: dryRun,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

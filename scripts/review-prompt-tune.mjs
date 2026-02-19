#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

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

const WEAK_REVIEW_REGEX =
  /\b(promises?|maybe|might|could|hopefully|probably|i\s+think|i\s+guess|we'?ll\s+see|let'?s\s+see|ridiculously\s+easy|amazing|game\s*changer|best\s+ever)\b/i;
const PLANNING_REVIEW_REGEX =
  /\b(in this video|today we|i'?m going to|let'?s dive|before we start|subscribe|smash that like)\b/i;
const GENERIC_REVIEW_REGEX =
  /\b(so yeah|that being said|overall it is good|it is nice|it is decent|check it out|link in description)\b/i;
const DECISION_TOPIC_REGEX =
  /\b(price|pricing|cost|expensive|cheap|credit|trial|refund|cancel|limit|slow|fast|quality|resolution|watermark|bug|crash|reliable|support|export|integration|template|voiceover|render|latency|use case|workflow|accuracy|control|edit|timeline)\b/i;
const DECISION_VERB_REGEX =
  /\b(is|are|has|have|does|doesn'?t|can|can'?t|cannot|takes|costs|supports|lacks|fails|works|breaks|requires|allows|blocks|exports|renders)\b/i;

const DEFAULTS = {
  toolSlug: "invideo-ai",
  limitVideos: 20,
  windowsPerVideo: 3,
  maxWindowChars: 1400,
  outDir: "data/review-tuning",
  goldModel: "gpt-4.1",
  miniModel: "gpt-4o-mini",
};

const SIGNAL_TOPIC_HINTS = [
  "price",
  "pricing",
  "cost",
  "credit",
  "trial",
  "refund",
  "cancel",
  "limit",
  "slow",
  "fast",
  "quality",
  "resolution",
  "watermark",
  "bug",
  "crash",
  "support",
  "export",
  "integrat",
  "workflow",
  "accuracy",
  "render",
  "latency",
  "template",
];

const SIGNAL_VERB_HINTS = [
  "is",
  "are",
  "has",
  "have",
  "does",
  "doesn't",
  "can",
  "can't",
  "cannot",
  "takes",
  "costs",
  "supports",
  "lacks",
  "fails",
  "works",
  "requires",
  "allows",
  "exports",
  "renders",
];

const COMPETITOR_HINTS = [
  "freepik",
  "freepick",
  "openart",
  "sora",
  "kling",
  "veo",
  "runway",
  "pika",
  "capcut",
  "premiere",
  "adobe",
  "midjourney",
];

const PROMPT_VARIANTS = [
  {
    id: "v1_baseline",
    system:
      "You extract review evidence from transcript text. Return one short verbatim quote only when it contains a concrete claim about the tool. Skip hype/speculation/promises. If none exists, return empty quote_text with Neutral sentiment and confidence 0.0. Do not paraphrase.",
    rules: [
      "quote_text must be verbatim from transcript.",
      "Ignore filler intros/outros/subscribe prompts.",
      "Prefer claims on quality, speed, pricing, reliability, limits, output, workflow.",
      "Reject speculative/hype wording such as 'maybe', 'promises to', 'amazing'.",
      "sponsored_flag is true only if the quote context explicitly indicates sponsorship/affiliate.",
    ],
  },
  {
    id: "v2_decision_strict",
    system:
      "Extract exactly one verbatim review quote only if it helps a buyer decide whether to use the tool for their constraints or goals. If no such quote exists, return empty quote_text.",
    rules: [
      "Must be verbatim and attributable to the transcript window.",
      "Accept only concrete claims about capability, limitation, quality, speed, pricing, reliability, compatibility, or fit-for-use-case.",
      "Reject intros, hype, predictions, vague praise, setup narration, and generic statements.",
      "Reject quotes that do not carry actionable information for a product decision.",
      "Allow up to 3 sentences if the thought is cohesive and decision-relevant.",
    ],
  },
  {
    id: "v3_examples_hard_negative",
    system:
      "You are extracting purchase-decision evidence. Return one verbatim quote only when it states a concrete, falsifiable claim about this tool. Return empty quote_text if none.",
    rules: [
      "Verbatim only. No rewriting.",
      "Keep quote focused on measurable outcomes, constraints, or tradeoffs.",
      "Positive examples: pricing limits, export quality, rendering speed, reliability issues, feature gaps, integration constraints.",
      "Negative examples to reject: 'this looks amazing', 'maybe it will...', 'it promises to...', 'I have been using this tool'.",
      "If uncertain, prefer empty output over weak output.",
    ],
  },
  {
    id: "v4_precision_first",
    system:
      "High precision mode. Output a quote only when it is clearly valuable for a user deciding tool suitability under real constraints. Otherwise output empty quote_text.",
    rules: [
      "Verbatim quote_text only.",
      "Must include at least one decision topic (price, quality, speed, limits, reliability, support, integrations, workflow, output) and one concrete claim verb.",
      "Reject any quote containing mostly speculation, marketing language, or non-evidential narration.",
      "A longer quote is allowed when the argument spans multiple sentences and remains concrete.",
      "sponsored_flag true only with explicit sponsorship/affiliate disclosure.",
    ],
  },
  {
    id: "v5_tool_scope_guard",
    system:
      "Extract a single verbatim quote only if it is clearly about the target tool and helps a user decide fit, risks, or tradeoffs. Return empty quote_text otherwise.",
    rules: [
      "Quote must be verbatim and decision-relevant.",
      "Reject quotes about competitor tools, even if useful in general.",
      "Accept concrete claims on capability, quality, speed, pricing, limits, reliability, workflow effort, or edit control.",
      "Reject narration, hype, speculation, channel filler, and broad praise.",
      "If evidence is weak, return empty quote_text.",
    ],
  },
  {
    id: "v6_balanced_decision",
    system:
      "You extract buyer-decision evidence for a specific tool from noisy transcript text. Return one high-value verbatim quote or empty quote_text.",
    rules: [
      "Keep only claims that help someone decide whether this tool suits their needs/constraints.",
      "Valid claim types include: feature capability, missing capability, output quality, speed, pricing tiers, credits, limits, watermark, reliability, and editing effort/time.",
      "Reject generic statements like 'looks amazing', promises, and future speculation.",
      "Reject competitor-focused claims unless the quote explicitly compares and still provides clear evidence about the target tool.",
      "Prefer precision over recall, but keep strong practical claims even without numbers.",
    ],
  },
  {
    id: "v7_practical_claims",
    system:
      "Extract one verbatim quote when it contains practical evidence that helps a buyer decide if this tool fits their workflow, limits, or budget. Otherwise return empty quote_text.",
    rules: [
      "Accept practical claims such as: credits/pricing tradeoffs, watermark/export limits, template/workflow effort, edit control, speed, or reliability constraints.",
      "Accept capability statements when they are specific enough to affect tool choice (for example: create full videos with prompts and minimal timeline editing).",
      "Reject intros, channel narration, hype, speculation, and generic praise.",
      "Reject competitor-only claims unless the quote clearly states a tradeoff about the target tool.",
      "Keep quote verbatim and coherent; prefer empty output over weak output.",
    ],
  },
];

function parseArgs(argv) {
  const out = { cmd: "run" };
  const args = [...argv];
  if (args[0] && !args[0].startsWith("--")) {
    out.cmd = args.shift();
  }

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [key, rawValue] = arg.slice(2).split("=");
    const value = rawValue === undefined ? true : rawValue;
    out[key] = value;
  }
  return out;
}

function parseEnv(text) {
  const env = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
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
    // optional
  }
  return { ...fileEnv, ...process.env };
}

class Rest {
  constructor(baseUrl, serviceKey) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
    this.serviceKey = serviceKey;
  }

  async req(method, endpoint, { query, body, prefer } = {}) {
    const url = new URL(`${this.baseUrl}/rest/v1/${endpoint}`);
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    const headers = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
    };
    if (prefer) headers.Prefer = prefer;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${method} ${endpoint} ${res.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }

  get(endpoint, query) {
    return this.req("GET", endpoint, { query });
  }
}

function inFilter(ids) {
  return `in.(${ids.join(",")})`;
}

function uniq(values) {
  return [...new Set(values)];
}

function normalizeText(input) {
  return String(input || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input) {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function normalizeToolTokens(input) {
  return tokenize(input).filter((token) => !["tool", "tools", "review", "tutorial", "ai"].includes(token));
}

function buildToolAliases(tool) {
  const aliases = new Set();
  aliases.add(String(tool.name || "").toLowerCase());
  aliases.add(String(tool.slug || "").toLowerCase().replace(/-/g, " "));
  for (const token of normalizeToolTokens(tool.name)) aliases.add(token);
  for (const token of normalizeToolTokens(tool.slug)) aliases.add(token);
  return [...aliases].filter((alias) => alias.length >= 3);
}

function normalizeCachedSegments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const startSeconds = Math.max(0, Math.floor(Number(item?.startSeconds || 0)));
      const durationSeconds = Math.max(1, Math.floor(Number(item?.durationSeconds || 1)));
      const text = normalizeText(item?.text || "");
      return { startSeconds, durationSeconds, text };
    })
    .filter((seg) => seg.text.length > 0);
}

function findMentionWindows(segments, aliases, windowSeconds = 60) {
  const windows = [];
  if (!segments.length) return windows;

  for (const segment of segments) {
    const lower = segment.text.toLowerCase();
    if (!aliases.some((alias) => lower.includes(alias))) continue;

    const start = Math.max(0, segment.startSeconds - Math.floor(windowSeconds / 2));
    const end = start + windowSeconds;
    const text = segments
      .filter((s) => s.startSeconds >= start && s.startSeconds <= end)
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;
    windows.push({ startSeconds: start, endSeconds: end, text });
  }

  windows.sort((a, b) => a.startSeconds - b.startSeconds);
  const merged = [];
  for (const win of windows) {
    const prev = merged[merged.length - 1];
    if (!prev || win.startSeconds > prev.endSeconds - 12) {
      merged.push({ ...win });
      continue;
    }
    prev.endSeconds = Math.max(prev.endSeconds, win.endSeconds);
    prev.text = `${prev.text} ${win.text}`.replace(/\s+/g, " ").trim();
  }

  return merged;
}

function overlapSeconds(a, b) {
  return Math.max(0, Math.min(a.endSeconds, b.endSeconds) - Math.max(a.startSeconds, b.startSeconds));
}

function buildWindowText(segments, startSeconds, endSeconds) {
  return segments
    .filter((seg) => seg.startSeconds >= startSeconds && seg.startSeconds <= endSeconds)
    .map((seg) => seg.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreWindowSignal(text) {
  const lower = normalizeText(text).toLowerCase();
  if (!lower) return 0;

  let score = 0;
  for (const hint of SIGNAL_TOPIC_HINTS) {
    if (lower.includes(hint)) score += 2;
  }
  for (const hint of SIGNAL_VERB_HINTS) {
    if (lower.includes(hint)) score += 1;
  }
  if (/\b\d+%|\$\d+|\b\d+\s*(sec|second|seconds|min|minute|minutes|hours?)\b/.test(lower)) score += 2;
  if (WEAK_REVIEW_REGEX.test(lower)) score -= 3;
  if (PLANNING_REVIEW_REGEX.test(lower)) score -= 2;

  return score;
}

function buildFallbackWindows(segments, count, blocked = [], windowSeconds = 60) {
  if (!segments.length || count <= 0) return [];

  const lastStart = segments[segments.length - 1]?.startSeconds ?? 0;
  const maxStart = Math.max(0, lastStart - windowSeconds);
  const step = 30;
  const candidates = [];

  for (let start = 0; start <= maxStart; start += step) {
    const end = start + windowSeconds;
    const text = buildWindowText(segments, start, end);
    if (!text) continue;
    candidates.push({
      startSeconds: start,
      endSeconds: end,
      text,
      score: scoreWindowSignal(text),
    });
  }

  if (candidates.length === 0) {
    const text = buildWindowText(segments, 0, windowSeconds);
    if (text) {
      candidates.push({
        startSeconds: 0,
        endSeconds: windowSeconds,
        text,
        score: scoreWindowSignal(text),
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.startSeconds - b.startSeconds;
  });

  const selected = [];
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (blocked.some((window) => overlapSeconds(window, candidate) > 12)) continue;
    if (selected.some((window) => overlapSeconds(window, candidate) > 12)) continue;
    selected.push(candidate);
  }

  if (selected.length === 0 && candidates.length > 0) {
    selected.push(candidates[0]);
  }

  return selected.slice(0, count);
}

function isVerbatimish(windowText, quoteText) {
  const windowNorm = normalizeText(windowText).toLowerCase();
  const quoteNorm = normalizeText(quoteText).toLowerCase();
  if (!quoteNorm || quoteNorm.length < 25) return false;
  if (windowNorm.includes(quoteNorm)) return true;

  const windowNoPunct = windowNorm.replace(/[^\w\s]/g, "");
  const quoteNoPunct = quoteNorm.replace(/[^\w\s]/g, "");
  return windowNoPunct.includes(quoteNoPunct);
}

function looksDecisionUseful(quoteText, toolName, toolAliases = [], windowText = "") {
  const quote = normalizeText(quoteText);
  if (!quote || quote.length < 35 || quote.length > 520) return false;
  if (/\?\s*$/.test(quote)) return false;
  if (WEAK_REVIEW_REGEX.test(quote)) return false;
  if (PLANNING_REVIEW_REGEX.test(quote)) return false;
  if (GENERIC_REVIEW_REGEX.test(quote)) return false;
  if (!DECISION_TOPIC_REGEX.test(quote)) return false;
  if (!DECISION_VERB_REGEX.test(quote)) return false;

  const toolTokens = normalizeToolTokens(toolName);
  const quoteLower = quote.toLowerCase();
  const windowLower = normalizeText(windowText).toLowerCase();
  const aliasHit = toolAliases.some((alias) => quoteLower.includes(alias) || windowLower.includes(alias));
  const competitorHit = COMPETITOR_HINTS.some((hint) => quoteLower.includes(hint));
  if (competitorHit && !aliasHit) return false;

  if (toolTokens.length > 0 && !toolTokens.some((token) => quoteLower.includes(token)) && !DECISION_TOPIC_REGEX.test(quote)) {
    return false;
  }

  return true;
}

function jaccardSimilarity(a, b) {
  const as = new Set(tokenize(a));
  const bs = new Set(tokenize(b));
  if (!as.size || !bs.size) return 0;
  let intersection = 0;
  for (const token of as) if (bs.has(token)) intersection += 1;
  const union = new Set([...as, ...bs]).size;
  return union === 0 ? 0 : intersection / union;
}

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

async function callOpenAiJson({ apiKey, model, schema, messages, temperature = 0 }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${model} failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "";
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    const block = content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content.match(/```([\s\S]*?)```/)?.[1] ?? "";
    if (!block) return null;
    return JSON.parse(block);
  }
}

async function fetchDataset({ db, toolSlug, limitVideos, windowsPerVideo, maxWindowChars }) {
  const tools = await db.get("tools", {
    select: "id,slug,name",
    slug: `eq.${toolSlug}`,
    limit: "1",
  });
  if (!tools.length) throw new Error(`Tool not found: ${toolSlug}`);
  const tool = tools[0];

  const mentions = await db.get("video_mentions", {
    select: "video_id",
    tool_id: `eq.${tool.id}`,
    limit: "10000",
  });
  const mentionIds = uniq(mentions.map((m) => m.video_id));
  if (!mentionIds.length) {
    throw new Error(`No videos linked for tool: ${tool.slug}`);
  }

  const videos = await db.get("youtube_videos", {
    select: "id,youtube_video_id,title,description,video_url,published_at",
    id: inFilter(mentionIds),
    order: "published_at.desc",
    limit: String(Math.max(limitVideos * 4, 40)),
  });

  const nonSeedVideos = videos.filter((v) => !String(v.youtube_video_id || "").startsWith("seed-"));
  const transcriptRows = nonSeedVideos.length
    ? await db.get("video_transcripts", {
      select: "video_id,segments_json,source,fetched_at",
      video_id: inFilter(nonSeedVideos.map((v) => v.id)),
      limit: "10000",
    })
    : [];
  const transcriptByVideoId = new Map(transcriptRows.map((row) => [row.video_id, row]));

  const aliases = buildToolAliases(tool);
  const selectedVideos = [];
  const windows = [];

  for (const video of nonSeedVideos) {
    if (selectedVideos.length >= limitVideos) break;
    const row = transcriptByVideoId.get(video.id);
    const segments = normalizeCachedSegments(row?.segments_json);
    if (!segments.length) continue;

    const mentionWindows = findMentionWindows(segments, aliases, 60).slice(0, windowsPerVideo);
    const neededFallback = Math.max(0, windowsPerVideo - mentionWindows.length);
    const fallbackWindows = buildFallbackWindows(segments, neededFallback, mentionWindows, 60);
    const allWindows = [
      ...mentionWindows.map((window) => ({ ...window, source: "mention" })),
      ...fallbackWindows.map((window) => ({ ...window, source: "fallback" })),
    ].slice(0, windowsPerVideo);

    if (!allWindows.length) continue;

    const materializedWindows = allWindows.map((window, index) => ({
      id: `${video.id}:${index + 1}`,
      video_id: video.id,
      youtube_video_id: video.youtube_video_id,
      video_title: video.title,
      video_url: video.video_url || `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
      publish_date: video.published_at ? String(video.published_at).slice(0, 10) : null,
      window_index: index + 1,
      window_source: window.source,
      start_seconds: window.startSeconds,
      end_seconds: window.endSeconds,
      signal_score: scoreWindowSignal(window.text),
      transcript_window: window.text.slice(0, maxWindowChars),
    }));

    selectedVideos.push({
      id: video.id,
      youtube_video_id: video.youtube_video_id,
      title: video.title,
      video_url: video.video_url || `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
      publish_date: video.published_at ? String(video.published_at).slice(0, 10) : null,
      transcript_source: row?.source || null,
      transcript_fetched_at: row?.fetched_at || null,
      segments_count: segments.length,
      windows_count: materializedWindows.length,
      mention_windows_count: mentionWindows.length,
      fallback_windows_count: fallbackWindows.length,
    });
    windows.push(...materializedWindows);
  }

  return {
    generated_at: new Date().toISOString(),
    tool,
    aliases,
    requested_video_limit: limitVideos,
    selected_video_count: selectedVideos.length,
    window_count: windows.length,
    videos: selectedVideos,
    windows,
  };
}

async function buildGold({ dataset, apiKey, model, criticModel }) {
  const extractionSchema = {
    name: "gold_review_candidates",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reviews: {
          type: "array",
          maxItems: 3,
          items: {
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
              why_valuable: { type: "string" },
            },
            required: ["quote_text", "sentiment", "topics", "sponsored_flag", "confidence", "why_valuable"],
          },
        },
      },
      required: ["reviews"],
    },
  };

  const criticSchema = {
    name: "gold_review_critic",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reviews: {
          type: "array",
          maxItems: 3,
          items: {
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
              critic_note: { type: "string" },
            },
            required: ["quote_text", "sentiment", "topics", "sponsored_flag", "confidence", "critic_note"],
          },
        },
      },
      required: ["reviews"],
    },
  };

  const byWindow = [];

  let index = 0;
  for (const window of dataset.windows) {
    index += 1;
    process.stdout.write(`gold ${index}/${dataset.windows.length}\r`);

    const extractMessages = [
      {
        role: "system",
        content:
          "You are an expert product reviewer. Extract only decision-useful verbatim evidence from transcript text. It is valid to return zero reviews.",
      },
      {
        role: "user",
        content: [
          `Tool: ${dataset.tool.name}`,
          "",
          "Transcript window:",
          window.transcript_window,
          "",
          "Selection criteria:",
          "- Keep only concrete claims that help users decide suitability under constraints.",
          "- Useful claims cover tradeoffs: quality, speed, pricing, limits, reliability, integrations, workflow fit.",
          "- Reject hype, speculation, vague praise, intros, narration, or meta-comments.",
          "- Keep quotes verbatim. No paraphrase.",
          "- If no valuable claim exists, return reviews: [].",
          "- A quote may contain 1-4 sentences when the argument is cohesive.",
        ].join("\n"),
      },
    ];

    const extracted = await callOpenAiJson({
      apiKey,
      model,
      schema: extractionSchema,
      messages: extractMessages,
      temperature: 0,
    }).catch(() => ({ reviews: [] }));

    const candidates = ensureArray(extracted?.reviews);

    const criticMessages = [
      {
        role: "system",
        content:
          "You are a strict reviewer. Keep only high-value decision evidence. When in doubt, reject. Output only approved reviews.",
      },
      {
        role: "user",
        content: [
          `Tool: ${dataset.tool.name}`,
          "",
          "Transcript window:",
          window.transcript_window,
          "",
          "Candidate reviews JSON:",
          JSON.stringify(candidates, null, 2),
          "",
          "Critic rules:",
          "- Quote must be verbatim from transcript.",
          "- Must include specific evidence useful for selecting or rejecting the tool.",
          "- Reject generic or speculative lines.",
          "- Reject if value is too weak or not actionable.",
          "- It is valid to return reviews: [].",
        ].join("\n"),
      },
    ];

    const criticized = await callOpenAiJson({
      apiKey,
      model: criticModel,
      schema: criticSchema,
      messages: criticMessages,
      temperature: 0,
    }).catch(() => ({ reviews: [] }));

    const finalReviews = ensureArray(criticized?.reviews)
      .map((item) => ({
        quote_text: normalizeText(item.quote_text || ""),
        sentiment: ["Pro", "Con", "Neutral"].includes(item.sentiment) ? item.sentiment : "Neutral",
        topics: ensureArray(item.topics).filter((topic) => REVIEW_TAGS.includes(topic)).slice(0, 4),
        sponsored_flag: Boolean(item.sponsored_flag),
        confidence: Number.isFinite(Number(item.confidence)) ? Math.max(0, Math.min(1, Number(item.confidence))) : 0.6,
        critic_note: normalizeText(item.critic_note || ""),
      }))
      .filter((item) => item.quote_text)
      .filter((item) => isVerbatimish(window.transcript_window, item.quote_text))
      .filter((item) => looksDecisionUseful(item.quote_text, dataset.tool.name, dataset.aliases, window.transcript_window));

    byWindow.push({
      window_id: window.id,
      video_id: window.video_id,
      youtube_video_id: window.youtube_video_id,
      window_index: window.window_index,
      start_seconds: window.start_seconds,
      transcript_window: window.transcript_window,
      reviews: finalReviews,
    });
  }
  process.stdout.write("\n");

  return {
    generated_at: new Date().toISOString(),
    tool: dataset.tool,
    gold_model: model,
    critic_model: criticModel,
    window_count: dataset.windows.length,
    windows: byWindow,
  };
}

async function extractMini({ apiKey, model, toolName, toolAliases, transcriptWindow, variant }) {
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

  const messages = [
    { role: "system", content: variant.system },
    {
      role: "user",
      content: [
        `Tool: ${toolName}`,
        `Tool aliases: ${toolAliases.join(", ")}`,
        "",
        "Transcript window:",
        transcriptWindow,
        "",
        "Rules:",
        ...variant.rules.map((rule) => `- ${rule}`),
      ].join("\n"),
    },
  ];

  const parsed = await callOpenAiJson({
    apiKey,
    model,
    schema,
    messages,
    temperature: 0,
  }).catch(() => null);

  const quoteText = normalizeText(parsed?.quote_text || "");
  if (!quoteText) {
    return {
      quote_text: "",
      sentiment: "Neutral",
      topics: ["Other"],
      sponsored_flag: false,
      confidence: 0,
    };
  }

  const validVerbatim = isVerbatimish(transcriptWindow, quoteText);
  const useful = looksDecisionUseful(quoteText, toolName, toolAliases, transcriptWindow);

  if (!validVerbatim || !useful) {
    return {
      quote_text: "",
      sentiment: "Neutral",
      topics: ["Other"],
      sponsored_flag: false,
      confidence: 0,
    };
  }

  return {
    quote_text: quoteText,
    sentiment: ["Pro", "Con", "Neutral"].includes(parsed?.sentiment) ? parsed.sentiment : "Neutral",
    topics: ensureArray(parsed?.topics).filter((topic) => REVIEW_TAGS.includes(topic)).slice(0, 4),
    sponsored_flag: Boolean(parsed?.sponsored_flag),
    confidence: Number.isFinite(Number(parsed?.confidence)) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : 0.6,
  };
}

function evaluatePrediction(pred, goldReviews) {
  const predQuote = normalizeText(pred?.quote_text || "");
  const goldQuotes = ensureArray(goldReviews).map((item) => normalizeText(item.quote_text || "")).filter(Boolean);
  const goldHas = goldQuotes.length > 0;
  const predHas = predQuote.length > 0;

  if (!goldHas && !predHas) return { label: "TN", bestScore: 1, bestGold: null };
  if (!goldHas && predHas) return { label: "FP", bestScore: 0, bestGold: null };
  if (goldHas && !predHas) return { label: "FN", bestScore: 0, bestGold: goldQuotes[0] };

  let bestScore = 0;
  let bestGold = null;
  for (const quote of goldQuotes) {
    const score = jaccardSimilarity(predQuote, quote);
    if (score > bestScore) {
      bestScore = score;
      bestGold = quote;
    }
  }

  if (bestScore >= 0.56) {
    return { label: "TP", bestScore, bestGold };
  }

  return { label: "FP_FN", bestScore, bestGold };
}

function summarizeMetrics(evaluations) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const e of evaluations) {
    if (e.label === "TP") tp += 1;
    else if (e.label === "FP") fp += 1;
    else if (e.label === "FN") fn += 1;
    else if (e.label === "TN") tn += 1;
    else if (e.label === "FP_FN") {
      fp += 1;
      fn += 1;
    }
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { tp, fp, fn, tn, precision, recall, f1 };
}

async function runMiniExperiments({ dataset, gold, apiKey, miniModel }) {
  const goldByWindow = new Map(gold.windows.map((row) => [row.window_id, row.reviews]));
  const variants = [];
  const allowedVariantIds = new Set(
    String(process.env.REVIEW_TUNE_VARIANTS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const activeVariants = allowedVariantIds.size > 0
    ? PROMPT_VARIANTS.filter((variant) => allowedVariantIds.has(variant.id))
    : PROMPT_VARIANTS;
  if (activeVariants.length === 0) {
    throw new Error(`No prompt variants matched REVIEW_TUNE_VARIANTS=${process.env.REVIEW_TUNE_VARIANTS || ""}`);
  }

  for (const variant of activeVariants) {
    const evaluations = [];
    const predictions = [];

    let index = 0;
    for (const window of dataset.windows) {
      index += 1;
      process.stdout.write(`mini ${variant.id} ${index}/${dataset.windows.length}\r`);
      const pred = await extractMini({
        apiKey,
        model: miniModel,
        toolName: dataset.tool.name,
        toolAliases: dataset.aliases || [],
        transcriptWindow: window.transcript_window,
        variant,
      });

      const score = evaluatePrediction(pred, goldByWindow.get(window.id) || []);
      evaluations.push({
        window_id: window.id,
        video_id: window.video_id,
        youtube_video_id: window.youtube_video_id,
        label: score.label,
        score: score.bestScore,
        gold_quote: score.bestGold,
      });
      predictions.push({
        window_id: window.id,
        quote_text: pred.quote_text,
        sentiment: pred.sentiment,
        topics: pred.topics,
        sponsored_flag: pred.sponsored_flag,
        confidence: pred.confidence,
      });
    }
    process.stdout.write("\n");

    const metrics = summarizeMetrics(evaluations);
    variants.push({
      variant_id: variant.id,
      metrics,
      predictions,
      evaluations,
    });
  }

  const best = [...variants].sort((a, b) => {
    if (b.metrics.f1 !== a.metrics.f1) return b.metrics.f1 - a.metrics.f1;
    if (b.metrics.precision !== a.metrics.precision) return b.metrics.precision - a.metrics.precision;
    return b.metrics.recall - a.metrics.recall;
  })[0];

  return {
    generated_at: new Date().toISOString(),
    tool: dataset.tool,
    mini_model: miniModel,
    gold_model: gold.gold_model,
    window_count: dataset.windows.length,
    best_variant: best?.variant_id || null,
    variants,
  };
}

function toMarkdownSummary({ dataset, gold, experiment }) {
  const lines = [];
  lines.push(`# Review Prompt Tuning Summary (${dataset.tool.slug})`);
  lines.push("");
  lines.push(`- Tool: ${dataset.tool.name} (${dataset.tool.slug})`);
  lines.push(`- Cached videos analyzed: ${dataset.selected_video_count}`);
  lines.push(`- Transcript windows analyzed: ${dataset.window_count}`);
  lines.push(`- Gold windows with >=1 valuable review: ${gold.windows.filter((w) => w.reviews.length > 0).length}`);
  lines.push(`- Best mini variant: ${experiment.best_variant}`);
  lines.push("");
  lines.push("## Variant Metrics");
  lines.push("");
  lines.push("| Variant | Precision | Recall | F1 | TP | FP | FN | TN |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const v of experiment.variants) {
    const m = v.metrics;
    lines.push(`| ${v.variant_id} | ${m.precision.toFixed(3)} | ${m.recall.toFixed(3)} | ${m.f1.toFixed(3)} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} |`);
  }
  lines.push("");

  const best = experiment.variants.find((v) => v.variant_id === experiment.best_variant);
  if (best) {
    lines.push("## Top Errors (Best Variant)");
    lines.push("");
    const hard = best.evaluations
      .filter((e) => e.label !== "TP" && e.label !== "TN")
      .slice(0, 12);
    for (const e of hard) {
      lines.push(`- ${e.label} window=${e.window_id} video=${e.youtube_video_id} overlap=${Number(e.score || 0).toFixed(2)}`);
    }
    if (hard.length === 0) lines.push("- No critical errors in sampled windows.");
  }

  return lines.join("\n");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();

  const toolSlug = String(args.tool || args.toolSlug || DEFAULTS.toolSlug);
  const limitVideos = Math.max(1, Number.parseInt(String(args.videos || args.limitVideos || DEFAULTS.limitVideos), 10) || DEFAULTS.limitVideos);
  const windowsPerVideo = Math.max(1, Number.parseInt(String(args.windowsPerVideo || DEFAULTS.windowsPerVideo), 10) || DEFAULTS.windowsPerVideo);
  const maxWindowChars = Math.max(600, Number.parseInt(String(args.maxWindowChars || DEFAULTS.maxWindowChars), 10) || DEFAULTS.maxWindowChars);
  const outDir = String(args.outDir || DEFAULTS.outDir);
  const goldModel = String(args.goldModel || DEFAULTS.goldModel);
  const criticModel = String(args.criticModel || goldModel);
  const miniModel = String(args.miniModel || DEFAULTS.miniModel);
  const variantsArg = String(args.variants || "").trim();
  if (variantsArg) {
    process.env.REVIEW_TUNE_VARIANTS = variantsArg;
  } else {
    delete process.env.REVIEW_TUNE_VARIANTS;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const openAiApiKey = env.OPENAI_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  }
  if (!openAiApiKey) {
    throw new Error("Missing OPENAI_API_KEY in env.");
  }

  const db = new Rest(supabaseUrl, serviceKey);

  const baseDir = path.join(process.cwd(), outDir, toolSlug);
  await ensureDir(baseDir);

  if (args.cmd === "eval-only") {
    const dataset = JSON.parse(await fs.readFile(path.join(baseDir, "dataset.windows.json"), "utf8"));
    const gold = JSON.parse(await fs.readFile(path.join(baseDir, "gold.reviews.json"), "utf8"));
    const experiment = await runMiniExperiments({
      dataset,
      gold,
      apiKey: openAiApiKey,
      miniModel,
    });
    await writeJson(path.join(baseDir, "mini.experiments.json"), experiment);
    const summary = toMarkdownSummary({ dataset, gold, experiment });
    await fs.writeFile(path.join(baseDir, "summary.md"), `${summary}\n`, "utf8");
    const best = experiment.variants.find((v) => v.variant_id === experiment.best_variant);
    console.log(JSON.stringify({
      mode: "eval-only",
      tool: dataset.tool,
      dataset_videos: dataset.selected_video_count,
      dataset_windows: dataset.window_count,
      best_variant: experiment.best_variant,
      best_metrics: best?.metrics ?? null,
      output_dir: baseDir,
    }, null, 2));
    return;
  }

  const dataset = await fetchDataset({
    db,
    toolSlug,
    limitVideos,
    windowsPerVideo,
    maxWindowChars,
  });
  await writeJson(path.join(baseDir, "dataset.windows.json"), dataset);

  if (dataset.selected_video_count < limitVideos) {
    console.warn(`Requested ${limitVideos} videos, but only ${dataset.selected_video_count} had cached transcripts/windows.`);
  }

  const gold = await buildGold({
    dataset,
    apiKey: openAiApiKey,
    model: goldModel,
    criticModel,
  });
  await writeJson(path.join(baseDir, "gold.reviews.json"), gold);

  const experiment = await runMiniExperiments({
    dataset,
    gold,
    apiKey: openAiApiKey,
    miniModel,
  });
  await writeJson(path.join(baseDir, "mini.experiments.json"), experiment);

  const summary = toMarkdownSummary({ dataset, gold, experiment });
  await fs.writeFile(path.join(baseDir, "summary.md"), `${summary}\n`, "utf8");

  const best = experiment.variants.find((v) => v.variant_id === experiment.best_variant);
  const metrics = best?.metrics || null;

  console.log(
    JSON.stringify(
      {
        tool: dataset.tool,
        dataset_videos: dataset.selected_video_count,
        dataset_windows: dataset.window_count,
        gold_positive_windows: gold.windows.filter((w) => w.reviews.length > 0).length,
        best_variant: experiment.best_variant,
        best_metrics: metrics,
        output_dir: baseDir,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

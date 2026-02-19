import type { TranscriptSegment } from "./types.ts";

export const REVIEW_TAGS = [
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
] as const;

type ReviewTag = (typeof REVIEW_TAGS)[number];

export type MentionWindow = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

const DECISION_SIGNAL_REGEX =
  /\b(price|pricing|cost|credit|trial|refund|cancel|limit|slow|fast|quality|resolution|watermark|bug|crash|support|export|workflow|edit|timeline|control|render|latency)\b/i;
const CLAIM_VERB_REGEX =
  /\b(is|are|has|have|does|doesn'?t|can|can'?t|cannot|takes|costs|supports|lacks|fails|works|requires|allows|exports|renders)\b/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildToolAliases(toolName: string): string[] {
  const normalized = toolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stop = new Set(["ai", "tool", "tools", "app", "platform", "software"]);
  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stop.has(token));

  const aliases = new Set<string>();
  if (normalized.length >= 3) aliases.add(normalized);
  for (const token of tokens) {
    if (token.length >= 4) aliases.add(token);
  }

  return [...aliases];
}

export function findMentionWindows(segments: TranscriptSegment[], toolName: string, windowSeconds = 45): MentionWindow[] {
  if (segments.length === 0) return [];
  const out: MentionWindow[] = [];
  const aliases = buildToolAliases(toolName);
  if (aliases.length === 0) return [];

  for (const segment of segments) {
    const lowerText = segment.text.toLowerCase();
    if (!aliases.some((alias) => lowerText.includes(alias))) continue;
    const half = Math.floor(windowSeconds / 2);
    const start = clamp(segment.startSeconds - half, 0, Number.MAX_SAFE_INTEGER);
    const end = start + windowSeconds;
    const windowText = segments
      .filter((s) => s.startSeconds >= start && s.startSeconds <= end)
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!windowText) continue;
    out.push({ startSeconds: start, endSeconds: end, text: windowText });
  }

  // Merge highly-overlapping windows.
  out.sort((a, b) => a.startSeconds - b.startSeconds);
  const merged: MentionWindow[] = [];
  for (const window of out) {
    const prev = merged[merged.length - 1];
    if (!prev || window.startSeconds > prev.endSeconds - 10) {
      merged.push(window);
      continue;
    }
    prev.endSeconds = Math.max(prev.endSeconds, window.endSeconds);
    prev.text = `${prev.text} ${window.text}`.replace(/\s+/g, " ").trim();
  }
  return merged;
}

function windowText(segments: TranscriptSegment[], startSeconds: number, endSeconds: number): string {
  return segments
    .filter((s) => s.startSeconds >= startSeconds && s.startSeconds <= endSeconds)
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalScore(text: string): number {
  if (!text) return 0;
  let score = 0;
  if (DECISION_SIGNAL_REGEX.test(text)) score += 3;
  if (CLAIM_VERB_REGEX.test(text)) score += 2;
  if (/\b\d+%|\$\d+|\b\d+\s*(minute|minutes|sec|seconds)\b/i.test(text)) score += 2;
  if (/in this video|today we|subscribe|like and comment/i.test(text)) score -= 2;
  if (/amazing|incredible|game changer|maybe|hopefully/i.test(text)) score -= 2;
  return score;
}

export function findDecisionFallbackWindows(
  segments: TranscriptSegment[],
  count = 1,
  windowSeconds = 45,
): MentionWindow[] {
  if (segments.length === 0 || count <= 0) return [];

  const lastStart = segments[segments.length - 1]?.startSeconds ?? 0;
  const maxStart = Math.max(0, lastStart - windowSeconds);
  const step = 30;

  const candidates: Array<MentionWindow & { score: number }> = [];
  for (let start = 0; start <= maxStart; start += step) {
    const end = start + windowSeconds;
    const text = windowText(segments, start, end);
    if (!text) continue;
    const score = signalScore(text);
    if (score < 2) continue;
    candidates.push({ startSeconds: start, endSeconds: end, text, score });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.startSeconds - b.startSeconds;
  });

  const selected: MentionWindow[] = [];
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (selected.some((window) => candidate.startSeconds <= window.endSeconds - 12)) continue;
    selected.push({
      startSeconds: candidate.startSeconds,
      endSeconds: candidate.endSeconds,
      text: candidate.text,
    });
  }

  return selected;
}

export function inferSentiment(text: string): "Pro" | "Con" | "Neutral" {
  const lower = text.toLowerCase();
  const positiveSignals = [
    "great",
    "fast",
    "easy",
    "strong",
    "excellent",
    "works well",
    "time saver",
    "reliable",
  ];
  const negativeSignals = [
    "expensive",
    "limited",
    "slow",
    "issue",
    "problem",
    "inconsistent",
    "hard",
    "bug",
  ];

  const positive = positiveSignals.filter((s) => lower.includes(s)).length;
  const negative = negativeSignals.filter((s) => lower.includes(s)).length;
  if (positive > negative) return "Pro";
  if (negative > positive) return "Con";
  return "Neutral";
}

export function inferTags(text: string): ReviewTag[] {
  const lower = text.toLowerCase();
  const tags: ReviewTag[] = [];

  if (/\bui\b|\bux\b|interface|workflow|editor/.test(lower)) tags.push("UI/UX");
  if (/quality|output|result|render|visual/.test(lower)) tags.push("Output quality");
  if (/relevant|fit|use case|niche/.test(lower)) tags.push("Relevance");
  if (/fast|speed|quick|latency|slow/.test(lower)) tags.push("Speed");
  if (/price|pricing|cost|expensive|cheap|credit/.test(lower)) tags.push("Pricing");
  if (/cancel|refund|billing/.test(lower)) tags.push("Cancellation/Refund");
  if (/limit|quota|cap|restriction/.test(lower)) tags.push("Limits");
  if (/integrat|api|zapier|plugin/.test(lower)) tags.push("Integrations");
  if (/watermark/.test(lower)) tags.push("Watermark");
  if (/export|compression|resolution/.test(lower)) tags.push("Export quality");
  if (/support|help|ticket/.test(lower)) tags.push("Support");
  if (/crash|stable|reliable|downtime|bug/.test(lower)) tags.push("Reliability");

  if (tags.length === 0) return ["Other"];
  return Array.from(new Set(tags)).slice(0, 4);
}

export function looksLikeConcreteClaim(text: string): boolean {
  if (!text || text.length < 30) return false;
  const lower = text.toLowerCase();
  if (/so i'?ve been using|let's jump in|subscribe|like and comment/.test(lower)) return false;
  return /\b(can|cannot|works|doesn'?t|faster|slower|better|worse|priced|cost|quality|export|limit)\b/.test(lower);
}

export function inferConfidence(text: string): number {
  let confidence = 0.55;
  if (looksLikeConcreteClaim(text)) confidence += 0.15;
  if (text.length > 120) confidence += 0.08;
  if (/\b\d+%|\$\d+/.test(text)) confidence += 0.07;
  return Math.min(0.95, confidence);
}

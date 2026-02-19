import { REVIEW_TAGS } from "./reviews.ts";

type ReviewSentiment = "Pro" | "Con" | "Neutral";

export type LlmReviewExtraction = {
  quote_text: string;
  sentiment: ReviewSentiment;
  topics: string[];
  sponsored_flag: boolean;
  confidence: number;
};

type ExtractionInput = {
  apiKey: string;
  model: string;
  toolName: string;
  transcriptWindow: string;
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.6;
  return Math.max(0, Math.min(1, value));
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isVerbatimishQuote(windowText: string, quote: string): boolean {
  if (!quote) return false;
  const cleanWindow = normalizeWhitespace(windowText).toLowerCase();
  const cleanQuote = normalizeWhitespace(quote).toLowerCase();
  if (cleanQuote.length < 25) return false;
  if (cleanWindow.includes(cleanQuote)) return true;

  // Soft fallback for tiny punctuation differences.
  const noPunctWindow = cleanWindow.replace(/[^\w\s]/g, "");
  const noPunctQuote = cleanQuote.replace(/[^\w\s]/g, "");
  return noPunctWindow.includes(noPunctQuote);
}

const WEAK_REVIEW_REGEX =
  /\b(promises?|maybe|might|could|hopefully|probably|i\s+think|i\s+guess|we'?ll\s+see|let'?s\s+see|ridiculously\s+easy|amazing)\b/i;
const PLANNING_REVIEW_REGEX =
  /\b(in this video|today we|i[' ]?m going to|let'?s dive|before we start|subscribe|smash that like)\b/i;
const GENERIC_REVIEW_REGEX =
  /\b(so yeah|that being said|overall it is good|it is nice|it is decent|check it out|link in description)\b/i;
const CONCRETE_CLAIM_TOPIC_REGEX =
  /\b(price|pricing|cost|expensive|cheap|credit|trial|refund|cancel|limit|slow|fast|quality|resolution|watermark|bug|crash|reliable|support|export|integrat|template|voiceover|render|latency|workflow|edit|timeline|control|effort)\b/i;
const CONCRETE_CLAIM_VERB_REGEX =
  /\b(is|are|has|have|does|doesn'?t|can|can'?t|cannot|takes|costs|supports|lacks|fails|works|does not|requires|allows|exports|renders|breaks)\b/i;
const COMPETITOR_REGEX = /\b(freepik|freepick|openart|sora|kling|veo|runway|pika|capcut|premiere|adobe|midjourney)\b/i;
const TRAILING_FRAGMENT_REGEX = /\b(and|or|but|with|to|for|of|in|on|at|as|like|about|upbeat)\s*$/i;

function buildToolAliases(toolName: string): string[] {
  const normalized = normalizeWhitespace(toolName).toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && token !== "tool" && token !== "review" && token !== "tutorial");
  return Array.from(new Set([normalized, ...tokens])).filter((alias) => alias.length >= 3);
}

function isUsefulQuote(quote: string, toolName: string, windowText: string): boolean {
  const cleanQuote = normalizeWhitespace(quote);
  if (!cleanQuote || cleanQuote.length < 35) return false;
  if (cleanQuote.split(/\s+/).length < 9) return false;
  if (TRAILING_FRAGMENT_REGEX.test(cleanQuote)) return false;
  if (WEAK_REVIEW_REGEX.test(cleanQuote)) return false;
  if (PLANNING_REVIEW_REGEX.test(cleanQuote)) return false;
  if (GENERIC_REVIEW_REGEX.test(cleanQuote)) return false;
  if (!CONCRETE_CLAIM_TOPIC_REGEX.test(cleanQuote)) return false;
  if (!CONCRETE_CLAIM_VERB_REGEX.test(cleanQuote)) return false;

  const aliases = buildToolAliases(toolName);
  const lowerQuote = cleanQuote.toLowerCase();
  const lowerWindow = normalizeWhitespace(windowText).toLowerCase();
  const hasToolContext = aliases.some((alias) => lowerQuote.includes(alias) || lowerWindow.includes(alias));

  if (COMPETITOR_REGEX.test(cleanQuote) && !hasToolContext) return false;

  const firstToken = aliases[1] ?? aliases[0] ?? "";
  if (firstToken && !lowerQuote.includes(firstToken) && !CONCRETE_CLAIM_TOPIC_REGEX.test(cleanQuote)) {
    return false;
  }

  return true;
}

function parseJsonFromChatContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const block = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? trimmed.match(/```([\s\S]*?)```/)?.[1];
    if (!block) throw new Error("Model output is not valid JSON.");
    return JSON.parse(block);
  }
}

export async function extractReviewWithLlm(input: ExtractionInput): Promise<LlmReviewExtraction | null> {
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
          items: { type: "string", enum: [...REVIEW_TAGS] },
          maxItems: 4,
        },
        sponsored_flag: { type: "boolean" },
        confidence: { type: "number" },
      },
      required: ["quote_text", "sentiment", "topics", "sponsored_flag", "confidence"],
    },
  };

  const systemPrompt =
    "Extract a single verbatim quote only if it is clearly about the target tool and helps a user decide fit, risks, or tradeoffs. Return empty quote_text otherwise.";

  const userPrompt = [
    `Tool: ${input.toolName}`,
    "",
    "Transcript window:",
    input.transcriptWindow,
    "",
    "Rules:",
    "- Quote must be verbatim and decision-relevant.",
    "- Reject quotes about competitor tools, even if useful in general.",
    "- Accept concrete claims on capability, quality, speed, pricing, limits, reliability, workflow effort, or edit control.",
    "- Reject narration, hype, predictions, vague praise, setup language, and generic statements.",
    "- If evidence is weak, return empty quote_text.",
    "- Allow up to 3 sentences when the thought is cohesive and still concrete.",
    "- sponsored_flag is true only if the quote context explicitly indicates sponsorship/affiliate.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content) return null;

  const parsed = parseJsonFromChatContent(content) as Partial<LlmReviewExtraction>;
  const quoteText = typeof parsed.quote_text === "string" ? normalizeWhitespace(parsed.quote_text) : "";
  if (!quoteText) return null;
  if (!isVerbatimishQuote(input.transcriptWindow, quoteText)) return null;
  if (!isUsefulQuote(quoteText, input.toolName, input.transcriptWindow)) return null;

  const sentiment = parsed.sentiment === "Pro" || parsed.sentiment === "Con" || parsed.sentiment === "Neutral"
    ? parsed.sentiment
    : "Neutral";

  const topics = Array.isArray(parsed.topics)
    ? parsed.topics.filter((topic): topic is string => typeof topic === "string" && REVIEW_TAGS.includes(topic as typeof REVIEW_TAGS[number]))
    : [];

  return {
    quote_text: quoteText,
    sentiment,
    topics: topics.length > 0 ? topics.slice(0, 4) : ["Other"],
    sponsored_flag: Boolean(parsed.sponsored_flag),
    confidence: clampConfidence(typeof parsed.confidence === "number" ? parsed.confidence : 0.6),
  };
}

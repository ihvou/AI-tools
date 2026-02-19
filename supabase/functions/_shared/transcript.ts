import type { TranscriptSegment } from "./types.ts";

type TimedTextResponse = {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string }>;
  }>;
};

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
};

type YoutubeITranscriptSegment = {
  startSeconds: number;
  durationSeconds: number;
  text: string;
};

type WatchPageContext = {
  html: string;
  captionTracks: CaptionTrack[];
  apiKey: string | null;
  clientVersion: string | null;
  visitorData: string | null;
  transcriptParams: string | null;
  transcriptContinuation: string | null;
};

const FALLBACK_INNERTUBE_API_KEYS = [
  // Widely used WEB key; fallback only when watch-page extraction does not provide an API key.
  "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
];

function decodeEntities(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function normalizeTranscriptText(input: string): string {
  return decodeEntities(input).replace(/\s+/g, " ").trim();
}

function parseTimedText(payload: TimedTextResponse): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const event of payload.events ?? []) {
    const startSeconds = Math.max(0, Math.floor((event.tStartMs ?? 0) / 1000));
    const durationSeconds = Math.max(1, Math.floor((event.dDurationMs ?? 1000) / 1000));
    const text = normalizeTranscriptText((event.segs ?? []).map((seg) => seg.utf8 ?? "").join(""));
    if (!text) continue;
    out.push({ startSeconds, durationSeconds, text });
  }
  return out;
}

function parseXmlTimedText(xmlText: string): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  const paragraphRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;

  for (const match of xmlText.matchAll(paragraphRegex)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";

    const startMs = Number.parseInt(attrs.match(/\bt="(\d+)"/)?.[1] ?? "0", 10);
    const durationMs = Number.parseInt(attrs.match(/\bd="(\d+)"/)?.[1] ?? "1000", 10);
    if (!Number.isFinite(startMs)) continue;

    const plain = body
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<\/?s\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ");
    const text = normalizeTranscriptText(plain);
    if (!text) continue;

    out.push({
      startSeconds: Math.max(0, Math.floor(startMs / 1000)),
      durationSeconds: Math.max(1, Math.floor((Number.isFinite(durationMs) ? durationMs : 1000) / 1000)),
      text,
    });
  }

  return out;
}

function parseTranscriptBody(rawText: string, contentType: string | null): TranscriptSegment[] {
  const text = rawText.trim();
  if (!text) return [];

  const preferJson = contentType?.includes("json") || text.startsWith("{");
  if (preferJson) {
    try {
      const payload = JSON.parse(text) as TimedTextResponse;
      const segments = parseTimedText(payload);
      if (segments.length > 0) return segments;
    } catch {
      // Continue to XML parser fallback.
    }
  }

  if (contentType?.includes("xml") || text.startsWith("<")) {
    return parseXmlTimedText(text);
  }

  try {
    const payload = JSON.parse(text) as TimedTextResponse;
    return parseTimedText(payload);
  } catch {
    return parseXmlTimedText(text);
  }
}

function parseCaptionTracks(captions: unknown): CaptionTrack[] {
  const tracklist = (captions as {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>;
    };
  })?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  return tracklist
    .map((track) => ({
      baseUrl: track.baseUrl ?? "",
      languageCode: track.languageCode,
      kind: track.kind,
    }))
    .filter((track) => track.baseUrl.length > 0);
}

function extractCaptionTracksFromHtml(html: string): CaptionTrack[] {
  const candidates: string[] = [];

  const directCaptions = html.match(/"captions":(\{.*?\}),"videoDetails"/s)?.[1];
  if (directCaptions) candidates.push(directCaptions);

  const initialPlayer = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/)?.[1];
  if (initialPlayer) {
    try {
      const payload = JSON.parse(initialPlayer) as { captions?: unknown };
      if (payload.captions) return parseCaptionTracks(payload.captions);
    } catch {
      // Ignore parse failures; regex fallback above will still run.
    }
  }

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value) as unknown;
      const tracks = parseCaptionTracks(parsed);
      if (tracks.length > 0) return tracks;
    } catch {
      // Ignore malformed candidate and continue.
    }
  }

  return [];
}

function extractInnertubeInfo(html: string): {
  apiKey: string | null;
  clientVersion: string | null;
  visitorData: string | null;
} {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ?? null;
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? "2.20260213.01.00";
  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] ?? null;
  return { apiKey, clientVersion, visitorData };
}

function extractTranscriptParams(html: string): string | null {
  return html.match(/"getTranscriptEndpoint":\{"params":"([^"]+)"\}/)?.[1] ?? null;
}

function extractTranscriptContinuation(html: string): string | null {
  const panelRegex =
    /"panelIdentifier":"engagement-panel-searchable-transcript"[\s\S]*?"continuationCommand":\{"token":"([^"]+)"\}/;
  return html.match(panelRegex)?.[1] ?? null;
}

async function fetchWatchPageContext(videoId: string, timeoutMs: number): Promise<WatchPageContext | null> {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;

  const html = await response.text();
  const captionTracks = extractCaptionTracksFromHtml(html);
  const { apiKey, clientVersion, visitorData } = extractInnertubeInfo(html);

  return {
    html,
    captionTracks,
    apiKey,
    clientVersion,
    visitorData,
    transcriptParams: extractTranscriptParams(html),
    transcriptContinuation: extractTranscriptContinuation(html),
  };
}

async function fetchTrackTranscript(baseUrl: string, videoId: string, timeoutMs: number): Promise<TranscriptSegment[]> {
  const urls: string[] = [];
  if (baseUrl.includes("fmt=")) {
    urls.push(baseUrl);
  } else {
    urls.push(`${baseUrl}&fmt=json3`);
    urls.push(`${baseUrl}&fmt=srv3`);
    urls.push(baseUrl);
  }

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": `https://www.youtube.com/watch?v=${videoId}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) continue;

      const text = await response.text();
      const segments = parseTranscriptBody(text, response.headers.get("content-type"));
      if (segments.length > 0) return segments;
    } catch {
      // Try next URL variant.
    }
  }

  return [];
}

async function fetchViaCaptionTracks(videoId: string, tracks: CaptionTrack[], timeoutMs: number): Promise<TranscriptSegment[]> {
  const ordered = [
    ...tracks.filter((track) => (track.languageCode ?? "").startsWith("en")),
    ...tracks.filter((track) => !(track.languageCode ?? "").startsWith("en")),
  ];

  for (const track of ordered) {
    const segments = await fetchTrackTranscript(track.baseUrl, videoId, timeoutMs);
    if (segments.length > 0) return segments;
  }

  return [];
}

async function fetchCaptionTracksViaPlayerApi(input: {
  apiKeys: string[];
  visitorData: string | null;
  videoId: string;
  timeoutMs: number;
}): Promise<{
  tracks: CaptionTrack[];
  attempts: number;
  networkErrors: number;
  nonOkStatuses: number[];
  okNoTracks: number;
}> {
  const nonOkStatuses: number[] = [];
  let attempts = 0;
  let networkErrors = 0;
  let okNoTracks = 0;

  const clients: Array<Record<string, unknown>> = [
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

  for (const apiKey of input.apiKeys) {
    const endpoint = new URL("https://www.youtube.com/youtubei/v1/player");
    endpoint.searchParams.set("prettyPrint", "false");
    endpoint.searchParams.set("key", apiKey);

    for (const client of clients) {
      const clientPayload = { ...client };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://www.youtube.com",
            "Referer": `https://www.youtube.com/watch?v=${input.videoId}`,
          },
          body: JSON.stringify({
            context: { client: clientPayload },
            videoId: input.videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
          signal: AbortSignal.timeout(input.timeoutMs),
        });
        attempts += 1;
        if (!response.ok) {
          nonOkStatuses.push(response.status);
          continue;
        }

        const payload = await response.json() as { captions?: unknown };
        const tracks = parseCaptionTracks(payload.captions);
        if (tracks.length > 0) {
          return { tracks, attempts, networkErrors, nonOkStatuses, okNoTracks };
        }
        okNoTracks += 1;
      } catch {
        attempts += 1;
        networkErrors += 1;
        // Try next client profile.
      }
    }
  }

  return { tracks: [], attempts, networkErrors, nonOkStatuses, okNoTracks };
}

function collectYoutubeiSegments(node: unknown, out: YoutubeITranscriptSegment[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectYoutubeiSegments(item, out);
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  if (obj.transcriptSegmentRenderer && typeof obj.transcriptSegmentRenderer === "object") {
    const renderer = obj.transcriptSegmentRenderer as Record<string, unknown>;
    const startMsRaw = renderer.startMs;
    const endMsRaw = renderer.endMs;
    const snippet = renderer.snippet as { runs?: Array<{ text?: string }> } | undefined;
    const text = (snippet?.runs ?? []).map((run) => run.text ?? "").join("").replace(/\s+/g, " ").trim();

    const startMs = typeof startMsRaw === "string" ? Number.parseInt(startMsRaw, 10) : Number(startMsRaw ?? 0);
    const endMs = typeof endMsRaw === "string" ? Number.parseInt(endMsRaw, 10) : Number(endMsRaw ?? 0);
    const durationSeconds = Math.max(1, Math.floor((Math.max(endMs - startMs, 1000)) / 1000));

    if (text && Number.isFinite(startMs)) {
      out.push({
        startSeconds: Math.max(0, Math.floor(startMs / 1000)),
        durationSeconds,
        text: normalizeTranscriptText(text),
      });
    }
  }

  for (const value of Object.values(obj)) {
    collectYoutubeiSegments(value, out);
  }
}

async function fetchViaYoutubeI(context: WatchPageContext, videoId: string, timeoutMs: number): Promise<TranscriptSegment[]> {
  if (!context.apiKey) return [];

  const endpoint = new URL("https://www.youtube.com/youtubei/v1/get_transcript");
  endpoint.searchParams.set("prettyPrint", "false");
  endpoint.searchParams.set("key", context.apiKey);

  const requestBody: Record<string, unknown> = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: context.clientVersion ?? "2.20260213.01.00",
      },
    },
  };

  if (context.visitorData) {
    (requestBody.context as { client: Record<string, unknown> }).client.visitorData = context.visitorData;
  }

  if (context.transcriptParams) {
    requestBody.params = context.transcriptParams;
  } else if (context.transcriptContinuation) {
    requestBody.continuation = context.transcriptContinuation;
  } else {
    return [];
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": context.clientVersion ?? "2.20260213.01.00",
        ...(context.visitorData ? { "X-Goog-Visitor-Id": context.visitorData } : {}),
        "Origin": "https://www.youtube.com",
        "Referer": `https://www.youtube.com/watch?v=${videoId}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const out: YoutubeITranscriptSegment[] = [];
    collectYoutubeiSegments(payload, out);
    return out;
  } catch {
    return [];
  }
}

async function fetchTimedTextLegacy(videoId: string, timeoutMs: number): Promise<TranscriptSegment[]> {
  const variants = [
    { lang: "en", kind: "asr", fmt: "json3" },
    { lang: "en", kind: null, fmt: "json3" },
    { lang: null, kind: "asr", fmt: "json3" },
    { lang: null, kind: null, fmt: "json3" },
    { lang: "en", kind: null, fmt: "srv3" },
  ];

  for (const variant of variants) {
    const url = new URL("https://www.youtube.com/api/timedtext");
    url.searchParams.set("v", videoId);
    if (variant.lang) url.searchParams.set("lang", variant.lang);
    if (variant.kind) url.searchParams.set("kind", variant.kind);
    if (variant.fmt) url.searchParams.set("fmt", variant.fmt);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) continue;
      const text = await response.text();
      const segments = parseTranscriptBody(text, response.headers.get("content-type"));
      if (segments.length > 0) return segments;
    } catch {
      // Try next variant.
    }
  }

  return [];
}

export async function fetchTranscriptSegments(videoId: string, timeoutMs: number): Promise<TranscriptSegment[]> {
  const context = await fetchWatchPageContext(videoId, timeoutMs);
  if (context) {
    const watchTrackSegments = await fetchViaCaptionTracks(videoId, context.captionTracks, timeoutMs);
    if (watchTrackSegments.length > 0) return watchTrackSegments;
  }

  const apiKeys = [
    ...(context?.apiKey ? [context.apiKey] : []),
    ...FALLBACK_INNERTUBE_API_KEYS,
  ];
  const playerResult = await fetchCaptionTracksViaPlayerApi({
    apiKeys: [...new Set(apiKeys)],
    visitorData: context?.visitorData ?? null,
    videoId,
    timeoutMs,
  });
  const playerTracks = playerResult.tracks;

  if (playerTracks.length > 0) {
    const playerTrackSegments = await fetchViaCaptionTracks(videoId, playerTracks, timeoutMs);
    if (playerTrackSegments.length > 0) return playerTrackSegments;
  }

  const legacySegments = await fetchTimedTextLegacy(videoId, timeoutMs);
  if (legacySegments.length > 0) return legacySegments;

  if (context) {
    const youtubeiSegments = await fetchViaYoutubeI(context, videoId, timeoutMs);
    if (youtubeiSegments.length > 0) return youtubeiSegments;
  }

  if (
    playerResult.tracks.length === 0 &&
    playerResult.attempts > 0 &&
    (playerResult.networkErrors > 0 || playerResult.nonOkStatuses.length > 0) &&
    playerResult.okNoTracks === 0
  ) {
    const statuses = [...new Set(playerResult.nonOkStatuses)].join(",") || "none";
    throw new Error(
      `Player API caption discovery failed before transcript parsing (attempts=${playerResult.attempts}, network_errors=${playerResult.networkErrors}, statuses=${statuses}).`,
    );
  }

  if (
    playerResult.tracks.length === 0 &&
    playerResult.okNoTracks > 0 &&
    (context?.captionTracks.length ?? 0) === 0
  ) {
    throw new Error(
      `Player API responded without captionTracks (ok_no_tracks=${playerResult.okNoTracks}, attempts=${playerResult.attempts}).`,
    );
  }

  const hadAnyTracks = (context?.captionTracks.length ?? 0) > 0 || playerTracks.length > 0;
  if (hadAnyTracks) {
    throw new Error(
      `Caption tracks found (watch=${context?.captionTracks.length ?? 0}, player=${playerTracks.length}), but transcript payload was empty for all retrieval paths.`,
    );
  }

  return [];
}

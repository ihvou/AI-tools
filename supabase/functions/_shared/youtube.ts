import type { YouTubeSearchItem, YouTubeVideoDetail } from "./types.ts";

type SearchApiResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; description?: string };
  }>;
};

type VideosApiResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
    };
  }>;
};

export class YouTubeClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchVideos(query: string, maxResults: number): Promise<YouTubeSearchItem[]> {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube search.list failed (${response.status}): ${await response.text()}`);
    }
    const payload = (await response.json()) as SearchApiResponse;
    return (payload.items ?? [])
      .map((item) => {
        const videoId = item.id?.videoId ?? "";
        if (!videoId) return null;
        return {
          videoId,
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
        };
      })
      .filter((v): v is YouTubeSearchItem => v !== null);
  }

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetail[]> {
    if (videoIds.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const out: YouTubeVideoDetail[] = [];
    for (const chunk of chunks) {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("id", chunk.join(","));
      url.searchParams.set("maxResults", String(chunk.length));
      url.searchParams.set("key", this.apiKey);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube videos.list failed (${response.status}): ${await response.text()}`);
      }
      const payload = (await response.json()) as VideosApiResponse;
      for (const item of payload.items ?? []) {
        if (!item.id) continue;
        out.push({
          videoId: item.id,
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
          channelId: item.snippet?.channelId ?? "",
          channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
          publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        });
      }
    }
    return out;
  }
}

export function mentionsToolInMetadata(toolName: string, title: string, description: string): boolean {
  const normalizedTool = toolName.toLowerCase().trim();
  const haystack = `${title} ${description}`.toLowerCase();
  return haystack.includes(normalizedTool);
}

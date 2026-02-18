import 'server-only';

import { cache } from 'react';
import { deals as mockDeals, reviewEvidence as mockReviews, tools as mockTools, categories as mockCategories } from '@/lib/data/mockData';
import type { Category, Deal, OfferType, ReviewEvidence, ReviewTag, Sentiment, Tool } from '@/lib/types';

type ToolRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  website_url: string;
  registration_url: string | null;
  short_tagline: string;
  pricing_model: Tool['pricing_model'];
  platforms: Tool['platforms'] | null;
  review_sources_count: number | null;
  last_seen_review_date: string | null;
  tool_categories: Array<{ categories: { name: string | null } | null }>;
};

type DealRow = {
  id: string;
  tool_id: string;
  offer_text: string;
  offer_type: string | null;
  code: string | null;
  link_url: string | null;
  last_seen: string;
  receipt_url: string;
  receipt_timestamp_seconds: number | null;
  category: string[] | null;
};

type ReviewRow = {
  id: string;
  tool_id: string;
  video_id: string;
  channel_name: string | null;
  video_title: string;
  publish_date: string;
  sentiment: string;
  tags: string[] | null;
  snippet_text: string;
  receipt_url: string;
  receipt_timestamp_seconds: number;
  sponsored_flag: boolean | null;
};

type AppData = {
  tools: Tool[];
  deals: Deal[];
  reviews: ReviewEvidence[];
  categories: Category[];
};

const CATEGORY_VALUES: Category[] = [
  'Repurposing',
  'UGC Avatars',
  'Captions',
  'Scripts/Hooks',
  'Video Gen/B-roll',
  'Dubbing/Voice',
];

const OFFER_TYPES: OfferType[] = ['Code', 'Link', 'Trial extension', 'Credit bonus', 'Unknown'];
const SENTIMENTS: Sentiment[] = ['Pro', 'Con', 'Neutral'];
const REVIEW_TAGS: ReviewTag[] = [
  'UI/UX',
  'Output quality',
  'Relevance',
  'Speed',
  'Pricing',
  'Cancellation/Refund',
  'Limits',
  'Integrations',
  'Watermark',
  'Export quality',
  'Support',
  'Reliability',
  'Other',
];

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anon, service };
}

function hasSupabaseConfig() {
  const { url, anon } = getSupabaseConfig();
  return Boolean(url && anon);
}

async function restGet<T>(pathWithQuery: string, useService = false): Promise<T> {
  const { url, anon, service } = getSupabaseConfig();
  if (!url || !anon) {
    throw new Error('Supabase env vars are missing');
  }
  const key = useService ? service : anon;
  if (!key) {
    throw new Error('Supabase key is missing');
  }

  const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Supabase REST failed ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function rpcCall<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, service } = getSupabaseConfig();
  if (!url || !service) {
    throw new Error('Missing Supabase service role credentials');
  }
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supabase RPC ${name} failed ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function asCategory(value: string): Category | null {
  return CATEGORY_VALUES.includes(value as Category) ? (value as Category) : null;
}

function toTimestamp(seconds: number | null | undefined): string {
  const total = Math.max(0, seconds ?? 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function mapTools(rows: ToolRow[]): { tools: Tool[]; idToSlug: Map<string, string>; categories: Category[] } {
  const categorySet = new Set<Category>();
  const idToSlug = new Map<string, string>();

  const tools: Tool[] = rows.map((row) => {
    const categories = row.tool_categories
      .map((tc) => (tc.categories?.name ? asCategory(tc.categories.name) : null))
      .filter((c): c is Category => c !== null);

    categories.forEach((c) => categorySet.add(c));
    idToSlug.set(row.id, row.slug);

    const tool: Tool = {
      tool_id: row.slug,
      name: row.name,
      logo_url: row.logo_url,
      website_url: row.website_url,
      short_tagline: row.short_tagline,
      categories,
      pricing_model: row.pricing_model,
      review_sources_count: row.review_sources_count ?? 0,
    };
    if (row.registration_url) tool.registration_url = row.registration_url;
    if (row.platforms && row.platforms.length > 0) tool.platforms = row.platforms;
    if (row.last_seen_review_date) tool.last_seen_review_date = row.last_seen_review_date;
    return tool;
  });

  return { tools, idToSlug, categories: Array.from(categorySet) };
}

function mapDeals(rows: DealRow[], idToSlug: Map<string, string>): Deal[] {
  return rows
    .map((row) => {
      const slug = idToSlug.get(row.tool_id);
      if (!slug) return null;

      const deal: Deal = {
        deal_id: row.id,
        tool_id: slug,
        offer_text: row.offer_text,
        offer_type: OFFER_TYPES.includes((row.offer_type || 'Unknown') as OfferType)
          ? (row.offer_type as OfferType)
          : 'Unknown',
        last_seen_date: row.last_seen.slice(0, 10),
        receipt_url: row.receipt_url,
        timestamp: toTimestamp(row.receipt_timestamp_seconds),
        category: (row.category || []).map(asCategory).filter((c): c is Category => c !== null),
      };
      if (row.code) deal.code = row.code;
      if (row.link_url) deal.link_url = row.link_url;
      return deal;
    })
    .filter((d): d is Deal => d !== null);
}

function mapReviews(rows: ReviewRow[], idToSlug: Map<string, string>): ReviewEvidence[] {
  return rows
    .map((row) => {
      const slug = idToSlug.get(row.tool_id);
      if (!slug) return null;

      const tags = (row.tags || [])
        .filter((tag): tag is ReviewTag => REVIEW_TAGS.includes(tag as ReviewTag));

      const review: ReviewEvidence = {
        review_id: row.id,
        tool_id: slug,
        video_id: row.video_id,
        channel_name: row.channel_name || 'Unknown channel',
        video_title: row.video_title,
        publish_date: row.publish_date,
        sentiment: SENTIMENTS.includes(row.sentiment as Sentiment) ? (row.sentiment as Sentiment) : 'Neutral',
        tags: tags.length > 0 ? tags : ['Other'],
        snippet_text: row.snippet_text,
        receipt_url: row.receipt_url,
        timestamp: toTimestamp(row.receipt_timestamp_seconds),
      };
      if (row.sponsored_flag !== null && row.sponsored_flag !== undefined) {
        review.sponsored_flag = row.sponsored_flag;
      }
      return review;
    })
    .filter((r): r is ReviewEvidence => r !== null);
}

async function loadFromSupabase(): Promise<AppData> {
  const [toolRows, dealRows, reviewRows] = await Promise.all([
    restGet<ToolRow[]>(
      'tools?select=id,slug,name,logo_url,website_url,registration_url,short_tagline,pricing_model,platforms,review_sources_count,last_seen_review_date,tool_categories(categories(name))&order=name.asc',
      true
    ),
    restGet<DealRow[]>(
      'deals?select=id,tool_id,offer_text,offer_type,code,link_url,last_seen,receipt_url,receipt_timestamp_seconds,category&order=last_seen.desc',
      true
    ),
    restGet<ReviewRow[]>(
      'review_snippets?select=id,tool_id,video_id,channel_name,video_title,publish_date,sentiment,tags,snippet_text,receipt_url,receipt_timestamp_seconds,sponsored_flag&order=publish_date.desc',
      true
    ),
  ]);

  const { tools, idToSlug, categories } = mapTools(toolRows);
  return {
    tools,
    deals: mapDeals(dealRows, idToSlug),
    reviews: mapReviews(reviewRows, idToSlug),
    categories: categories.length > 0 ? categories : CATEGORY_VALUES,
  };
}

export const getAppData = cache(async (): Promise<AppData> => {
  if (!hasSupabaseConfig()) {
    return {
      tools: mockTools,
      deals: mockDeals,
      reviews: mockReviews,
      categories: mockCategories,
    };
  }

  try {
    return await loadFromSupabase();
  } catch (error) {
    console.error('Using mock data fallback because Supabase read failed', error);
    return {
      tools: mockTools,
      deals: mockDeals,
      reviews: mockReviews,
      categories: mockCategories,
    };
  }
});

export async function createReport(input: {
  reportType: 'review' | 'deal';
  entityId: string;
  issueType: string;
  notes?: string;
}) {
  const payload = {
    report_type: input.reportType,
    entity_id: input.entityId,
    issue_type: input.issueType,
    notes: input.notes ?? null,
  };

  const { url, service } = getSupabaseConfig();
  if (!url || !service) {
    throw new Error('Missing Supabase service role credentials');
  }

  const response = await fetch(`${url}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Report create failed ${response.status}: ${await response.text()}`);
  }
}

export async function getCategoryCounts() {
  return rpcCall<
    Array<{ category_id: string; name: Category; slug: string; tool_count: number; deal_count: number }>
  >('get_category_counts', {});
}

export async function searchAll(query: string) {
  return rpcCall<{ tools: Tool[]; deals: Deal[] }>('search_all', { q: query });
}

export function getCategorySlug(category: Category): string {
  return category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

export function getCategoryFromSlug(slug: string, categories: Category[]): Category | undefined {
  return categories.find((category) => getCategorySlug(category) === slug);
}

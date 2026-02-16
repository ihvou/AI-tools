// Data types matching the strict data model

export type PricingModel = 'Free' | 'Free trial' | 'Paid' | 'Freemium' | 'Unknown';
export type Platform = 'Web' | 'iOS' | 'Android' | 'Desktop' | 'API' | 'Unknown';
export type Category = 
  | 'Repurposing' 
  | 'UGC Avatars' 
  | 'Captions' 
  | 'Scripts/Hooks' 
  | 'Video Gen/B-roll' 
  | 'Dubbing/Voice';
export type Sentiment = 'Pro' | 'Con' | 'Neutral';
export type ReviewTag = 
  | 'UI/UX' 
  | 'Output quality' 
  | 'Relevance' 
  | 'Speed' 
  | 'Pricing' 
  | 'Cancellation/Refund' 
  | 'Limits' 
  | 'Integrations' 
  | 'Watermark' 
  | 'Export quality' 
  | 'Support' 
  | 'Reliability' 
  | 'Other';
export type OfferType = 'Code' | 'Link' | 'Trial extension' | 'Credit bonus' | 'Unknown';
export type OfferSize = 'Small' | 'Medium' | 'Large' | 'Unknown';

export interface Tool {
  tool_id: string;
  name: string;
  logo_url: string;
  website_url: string;
  registration_url?: string;
  short_tagline: string;
  categories: Category[];
  pricing_model: PricingModel;
  platforms?: Platform[];
  review_sources_count?: number;
  last_seen_review_date?: string;
}

export interface ReviewEvidence {
  review_id: string;
  tool_id: string;
  video_id: string;
  channel_name: string;
  video_title: string;
  publish_date: string;
  sentiment: Sentiment;
  tags: ReviewTag[];
  snippet_text: string;
  receipt_url: string;
  timestamp: string;
  sponsored_flag?: boolean;
}

export interface Deal {
  deal_id: string;
  tool_id: string;
  offer_text: string;
  offer_type: OfferType;
  code?: string;
  link_url?: string;
  last_seen_date: string;
  receipt_url: string;
  timestamp: string;
  category: Category[];
  offer_size?: OfferSize;
}

export interface CategoryInfo {
  slug: string;
  name: Category;
  tools_count: number;
  deals_count: number;
}

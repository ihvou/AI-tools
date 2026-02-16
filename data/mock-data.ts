import { Tool, ReviewEvidence, Deal, Category, CategoryInfo } from '@/types';

// Mock tools data
export const tools: Tool[] = [
  {
    tool_id: 'opus-clip',
    name: 'OpusClip',
    logo_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
    website_url: 'https://opusclip.com',
    registration_url: 'https://opusclip.com/signup',
    short_tagline: 'AI-powered video repurposing for short-form content',
    categories: ['Repurposing', 'Captions'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 24,
    last_seen_review_date: '2026-02-08'
  },
  {
    tool_id: 'heygen',
    name: 'HeyGen',
    logo_url: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=100&h=100&fit=crop',
    website_url: 'https://heygen.com',
    short_tagline: 'AI avatars and video generation platform',
    categories: ['UGC Avatars', 'Video Gen/B-roll'],
    pricing_model: 'Paid',
    platforms: ['Web', 'API'],
    review_sources_count: 18,
    last_seen_review_date: '2026-02-05'
  },
  {
    tool_id: 'descript',
    name: 'Descript',
    logo_url: 'https://images.unsplash.com/photo-1598908314077-8ac7bb123c3c?w=100&h=100&fit=crop',
    website_url: 'https://descript.com',
    short_tagline: 'All-in-one video and audio editing',
    categories: ['Repurposing', 'Captions', 'Dubbing/Voice'],
    pricing_model: 'Freemium',
    platforms: ['Web', 'Desktop'],
    review_sources_count: 31,
    last_seen_review_date: '2026-02-09'
  },
  {
    tool_id: 'capcut',
    name: 'CapCut',
    logo_url: 'https://images.unsplash.com/photo-1579547944212-c4f4d8d0c5c3?w=100&h=100&fit=crop',
    website_url: 'https://capcut.com',
    short_tagline: 'Free video editing with AI features',
    categories: ['Repurposing', 'Captions'],
    pricing_model: 'Free',
    platforms: ['Web', 'iOS', 'Android', 'Desktop'],
    review_sources_count: 42,
    last_seen_review_date: '2026-02-10'
  },
  {
    tool_id: 'elevenlabs',
    name: 'ElevenLabs',
    logo_url: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=100&h=100&fit=crop',
    website_url: 'https://elevenlabs.io',
    short_tagline: 'AI voice generation and dubbing',
    categories: ['Dubbing/Voice'],
    pricing_model: 'Freemium',
    platforms: ['Web', 'API'],
    review_sources_count: 27,
    last_seen_review_date: '2026-02-07'
  },
  {
    tool_id: 'submagic',
    name: 'Submagic',
    logo_url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=100&h=100&fit=crop',
    website_url: 'https://submagic.co',
    short_tagline: 'AI captions and subtitles for videos',
    categories: ['Captions'],
    pricing_model: 'Paid',
    platforms: ['Web'],
    review_sources_count: 15,
    last_seen_review_date: '2026-02-06'
  },
  {
    tool_id: 'invideo-ai',
    name: 'InVideo AI',
    logo_url: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=100&h=100&fit=crop',
    website_url: 'https://invideo.io',
    short_tagline: 'Create videos from text prompts',
    categories: ['Video Gen/B-roll', 'Scripts/Hooks'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 22,
    last_seen_review_date: '2026-02-04'
  },
  {
    tool_id: 'runway',
    name: 'Runway',
    logo_url: 'https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=100&h=100&fit=crop',
    website_url: 'https://runwayml.com',
    short_tagline: 'Advanced AI video generation and editing',
    categories: ['Video Gen/B-roll'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 19,
    last_seen_review_date: '2026-02-03'
  },
  {
    tool_id: 'pictory',
    name: 'Pictory',
    logo_url: 'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=100&h=100&fit=crop',
    website_url: 'https://pictory.ai',
    short_tagline: 'Transform scripts into videos',
    categories: ['Scripts/Hooks'],
    pricing_model: 'Paid',
    platforms: ['Web'],
    review_sources_count: 14,
    last_seen_review_date: '2026-01-28'
  },
  {
    tool_id: 'synthesia',
    name: 'Synthesia',
    logo_url: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=100&h=100&fit=crop',
    website_url: 'https://synthesia.io',
    short_tagline: 'AI video creation with avatars',
    categories: ['UGC Avatars'],
    pricing_model: 'Paid',
    platforms: ['Web'],
    review_sources_count: 16,
    last_seen_review_date: '2026-02-01'
  },
  {
    tool_id: 'veed',
    name: 'VEED',
    logo_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=100&h=100&fit=crop',
    website_url: 'https://veed.io',
    short_tagline: 'Online video editing made simple',
    categories: ['Repurposing'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 20,
    last_seen_review_date: '2026-02-02'
  },
  {
    tool_id: 'vidyo',
    name: 'Vidyo.ai',
    logo_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop',
    website_url: 'https://vidyo.ai',
    short_tagline: 'Repurpose long videos into shorts',
    categories: ['Repurposing'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 11,
    last_seen_review_date: '2026-01-30'
  }
];

// Mock review evidence data
export const reviewEvidence: ReviewEvidence[] = [
  {
    review_id: 'rev-001',
    tool_id: 'opus-clip',
    video_id: 'abc123',
    channel_name: 'Creator Economy Podcast',
    video_title: 'Best AI Tools for Content Repurposing in 2026',
    publish_date: '2026-02-08',
    sentiment: 'Pro',
    tags: ['UI/UX', 'Output quality'],
    snippet_text: 'OpusClip automatically identifies the most engaging moments and creates clips with captions. The interface is intuitive and saves hours of editing time.',
    receipt_url: 'https://youtube.com/watch?v=abc123&t=342',
    timestamp: '5:42'
  },
  {
    review_id: 'rev-002',
    tool_id: 'opus-clip',
    video_id: 'def456',
    channel_name: 'Marketing with Mike',
    video_title: 'I Tested 5 AI Video Repurposing Tools',
    publish_date: '2026-02-05',
    sentiment: 'Con',
    tags: ['Pricing', 'Limits'],
    snippet_text: 'The free plan is very limited - only 10 minutes of processing per month. For serious creators, you need to upgrade quickly which can get expensive.',
    receipt_url: 'https://youtube.com/watch?v=def456&t=518',
    timestamp: '8:38'
  },
  {
    review_id: 'rev-003',
    tool_id: 'opus-clip',
    video_id: 'ghi789',
    channel_name: 'AI Tools Daily',
    video_title: 'OpusClip Update: New Features Review',
    publish_date: '2026-01-28',
    sentiment: 'Pro',
    tags: ['Speed', 'Output quality'],
    snippet_text: 'Processing is now much faster - my 1-hour podcast turned into 15 clips in about 8 minutes. Quality has improved significantly.',
    receipt_url: 'https://youtube.com/watch?v=ghi789&t=156',
    timestamp: '2:36'
  },
  {
    review_id: 'rev-004',
    tool_id: 'elevenlabs',
    video_id: 'bcd890',
    channel_name: 'AI Voice Review',
    video_title: 'ElevenLabs Voice Cloning Test',
    publish_date: '2026-02-07',
    sentiment: 'Pro',
    tags: ['Output quality', 'Relevance'],
    snippet_text: 'Voice cloning quality is outstanding. Sounds natural with proper emotion and intonation.',
    receipt_url: 'https://youtube.com/watch?v=bcd890&t=445',
    timestamp: '7:25'
  },
  {
    review_id: 'rev-005',
    tool_id: 'elevenlabs',
    video_id: 'efg123',
    channel_name: 'Content Automation',
    video_title: 'AI Voice Tools Compared',
    publish_date: '2026-02-01',
    sentiment: 'Con',
    tags: ['Limits', 'Pricing'],
    snippet_text: 'Character limits on lower tiers are restrictive. Free plan only gives 10k characters per month which runs out fast.',
    receipt_url: 'https://youtube.com/watch?v=efg123&t=512',
    timestamp: '8:32'
  },
];

// Mock deals data
export const deals: Deal[] = [
  {
    deal_id: 'deal-001',
    tool_id: 'opus-clip',
    offer_text: '30% off annual plan',
    offer_type: 'Code',
    code: 'CREATOR30',
    last_seen_date: '2026-02-08',
    receipt_url: 'https://youtube.com/watch?v=abc123&t=782',
    timestamp: '13:02',
    category: ['Repurposing', 'Captions'],
    offer_size: 'Large'
  },
  {
    deal_id: 'deal-002',
    tool_id: 'heygen',
    offer_text: '2 months free on annual subscription',
    offer_type: 'Link',
    link_url: 'https://heygen.com/promo',
    last_seen_date: '2026-02-05',
    receipt_url: 'https://youtube.com/watch?v=jkl012&t=634',
    timestamp: '10:34',
    category: ['UGC Avatars', 'Video Gen/B-roll'],
    offer_size: 'Large'
  },
  {
    deal_id: 'deal-003',
    tool_id: 'descript',
    offer_text: 'Extended 14-day trial',
    offer_type: 'Trial extension',
    link_url: 'https://descript.com/trial',
    last_seen_date: '2026-02-09',
    receipt_url: 'https://youtube.com/watch?v=pqr678&t=945',
    timestamp: '15:45',
    category: ['Repurposing', 'Captions', 'Dubbing/Voice'],
    offer_size: 'Small'
  },
  {
    deal_id: 'deal-004',
    tool_id: 'elevenlabs',
    offer_text: '10,000 bonus characters on first month',
    offer_type: 'Credit bonus',
    code: 'VOICE10K',
    last_seen_date: '2026-02-07',
    receipt_url: 'https://youtube.com/watch?v=bcd890&t=823',
    timestamp: '13:43',
    category: ['Dubbing/Voice'],
    offer_size: 'Medium'
  },
  {
    deal_id: 'deal-005',
    tool_id: 'invideo-ai',
    offer_text: '25% off first 3 months',
    offer_type: 'Code',
    code: 'VIDEO25',
    last_seen_date: '2026-02-04',
    receipt_url: 'https://youtube.com/watch?v=nop012&t=567',
    timestamp: '9:27',
    category: ['Video Gen/B-roll', 'Scripts/Hooks'],
    offer_size: 'Medium'
  },
  {
    deal_id: 'deal-006',
    tool_id: 'submagic',
    offer_text: '20% off any plan',
    offer_type: 'Code',
    code: 'CAPTIONS20',
    last_seen_date: '2026-02-06',
    receipt_url: 'https://youtube.com/watch?v=hij456&t=412',
    timestamp: '6:52',
    category: ['Captions'],
    offer_size: 'Small'
  },
  {
    deal_id: 'deal-007',
    tool_id: 'runway',
    offer_text: '40% off first month',
    offer_type: 'Code',
    code: 'RUNWAY40',
    last_seen_date: '2026-02-03',
    receipt_url: 'https://youtube.com/watch?v=abc789&t=234',
    timestamp: '3:54',
    category: ['Video Gen/B-roll'],
    offer_size: 'Large'
  },
  {
    deal_id: 'deal-008',
    tool_id: 'veed',
    offer_text: 'Extended 30-day trial',
    offer_type: 'Trial extension',
    last_seen_date: '2026-02-02',
    receipt_url: 'https://youtube.com/watch?v=def123&t=678',
    timestamp: '11:18',
    category: ['Repurposing'],
    offer_size: 'Small'
  },
  {
    deal_id: 'deal-009',
    tool_id: 'synthesia',
    offer_text: 'Free avatar customization ($99 value)',
    offer_type: 'Credit bonus',
    last_seen_date: '2026-02-01',
    receipt_url: 'https://youtube.com/watch?v=ghi456&t=345',
    timestamp: '5:45',
    category: ['UGC Avatars'],
    offer_size: 'Large'
  },
  {
    deal_id: 'deal-010',
    tool_id: 'pictory',
    offer_text: '15% off annual subscription',
    offer_type: 'Code',
    code: 'SAVE15',
    last_seen_date: '2026-01-28',
    receipt_url: 'https://youtube.com/watch?v=jkl789&t=512',
    timestamp: '8:32',
    category: ['Scripts/Hooks'],
    offer_size: 'Small'
  }
];

// Helper functions
export function getToolById(toolId: string): Tool | undefined {
  return tools.find(tool => tool.tool_id === toolId);
}

export function getToolsByCategory(category: Category): Tool[] {
  return tools.filter(tool => tool.categories.includes(category));
}

export function getReviewsByToolId(toolId: string): ReviewEvidence[] {
  return reviewEvidence.filter(review => review.tool_id === toolId);
}

export function getDealsByToolId(toolId: string): Deal[] {
  return deals.filter(deal => deal.tool_id === toolId);
}

export function getToolsWithDeals(): Tool[] {
  const toolIdsWithDeals = new Set(deals.map(deal => deal.tool_id));
  return tools.filter(tool => toolIdsWithDeals.has(tool.tool_id));
}

export function getCategorySlug(category: Category): string {
  return category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

export function getCategoryFromSlug(slug: string): Category | null {
  const categories: Category[] = [
    'Repurposing',
    'UGC Avatars',
    'Captions',
    'Scripts/Hooks',
    'Video Gen/B-roll',
    'Dubbing/Voice'
  ];
  
  return categories.find(cat => getCategorySlug(cat) === slug) || null;
}

export const categories: CategoryInfo[] = [
  {
    slug: 'repurposing',
    name: 'Repurposing',
    tools_count: tools.filter(t => t.categories.includes('Repurposing')).length,
    deals_count: deals.filter(d => d.category.includes('Repurposing')).length
  },
  {
    slug: 'ugc-avatars',
    name: 'UGC Avatars',
    tools_count: tools.filter(t => t.categories.includes('UGC Avatars')).length,
    deals_count: deals.filter(d => d.category.includes('UGC Avatars')).length
  },
  {
    slug: 'captions',
    name: 'Captions',
    tools_count: tools.filter(t => t.categories.includes('Captions')).length,
    deals_count: deals.filter(d => d.category.includes('Captions')).length
  },
  {
    slug: 'scripts-hooks',
    name: 'Scripts/Hooks',
    tools_count: tools.filter(t => t.categories.includes('Scripts/Hooks')).length,
    deals_count: deals.filter(d => d.category.includes('Scripts/Hooks')).length
  },
  {
    slug: 'video-gen-b-roll',
    name: 'Video Gen/B-roll',
    tools_count: tools.filter(t => t.categories.includes('Video Gen/B-roll')).length,
    deals_count: deals.filter(d => d.category.includes('Video Gen/B-roll')).length
  },
  {
    slug: 'dubbing-voice',
    name: 'Dubbing/Voice',
    tools_count: tools.filter(t => t.categories.includes('Dubbing/Voice')).length,
    deals_count: deals.filter(d => d.category.includes('Dubbing/Voice')).length
  }
];

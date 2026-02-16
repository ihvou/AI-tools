import { Tool, ReviewEvidence, Deal, Category } from '@/lib/types';

// Mock tools data
export const tools: Tool[] = [
  {
    tool_id: 'opus-clip',
    name: 'OpusClip',
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
    logo_url: 'https://placehold.co/100x100/2563eb/white',
    website_url: 'https://pictory.ai',
    short_tagline: 'Transform scripts into videos',
    categories: ['Video Gen/B-roll', 'Scripts/Hooks'],
    pricing_model: 'Paid',
    platforms: ['Web'],
    review_sources_count: 14,
    last_seen_review_date: '2026-01-28'
  },
  {
    tool_id: 'synthesia',
    name: 'Synthesia',
    logo_url: 'https://placehold.co/100x100/2563eb/white',
    website_url: 'https://synthesia.io',
    short_tagline: 'AI video creation with avatars',
    categories: ['UGC Avatars', 'Video Gen/B-roll'],
    pricing_model: 'Paid',
    platforms: ['Web'],
    review_sources_count: 16,
    last_seen_review_date: '2026-02-01'
  },
  {
    tool_id: 'veed',
    name: 'VEED',
    logo_url: 'https://placehold.co/100x100/2563eb/white',
    website_url: 'https://veed.io',
    short_tagline: 'Online video editing made simple',
    categories: ['Repurposing', 'Captions'],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    review_sources_count: 20,
    last_seen_review_date: '2026-02-02'
  },
  {
    tool_id: 'vidyo',
    name: 'Vidyo.ai',
    logo_url: 'https://placehold.co/100x100/2563eb/white',
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
  // OpusClip reviews
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
    timestamp: '2:36',
    sponsored_flag: false
  },
  // HeyGen reviews
  {
    review_id: 'rev-004',
    tool_id: 'heygen',
    video_id: 'jkl012',
    channel_name: 'Digital Marketing Today',
    video_title: 'AI Avatar Tools Comparison 2026',
    publish_date: '2026-02-05',
    sentiment: 'Pro',
    tags: ['Output quality', 'UI/UX'],
    snippet_text: 'HeyGen avatars look incredibly realistic. Lip sync is accurate and the range of customization options is impressive.',
    receipt_url: 'https://youtube.com/watch?v=jkl012&t=412',
    timestamp: '6:52',
    sponsored_flag: true
  },
  {
    review_id: 'rev-005',
    tool_id: 'heygen',
    video_id: 'mno345',
    channel_name: 'Tech Review Hub',
    video_title: 'Is HeyGen Worth the Cost?',
    publish_date: '2026-01-31',
    sentiment: 'Con',
    tags: ['Pricing'],
    snippet_text: 'At $30 per month minimum, HeyGen is one of the pricier options. Great quality but might not fit smaller budgets.',
    receipt_url: 'https://youtube.com/watch?v=mno345&t=245',
    timestamp: '4:05'
  },
  // Descript reviews
  {
    review_id: 'rev-006',
    tool_id: 'descript',
    video_id: 'pqr678',
    channel_name: 'Podcast Production Tips',
    video_title: 'Descript Tutorial: Everything You Need to Know',
    publish_date: '2026-02-09',
    sentiment: 'Pro',
    tags: ['UI/UX', 'Integrations'],
    snippet_text: 'The ability to edit video by editing text is game-changing. Makes editing as easy as working in Google Docs.',
    receipt_url: 'https://youtube.com/watch?v=pqr678&t=89',
    timestamp: '1:29'
  },
  {
    review_id: 'rev-007',
    tool_id: 'descript',
    video_id: 'stu901',
    channel_name: 'Content Creator Academy',
    video_title: 'Descript vs Premiere Pro',
    publish_date: '2026-02-03',
    sentiment: 'Neutral',
    tags: ['Export quality', 'Speed'],
    snippet_text: 'Export times can be slow for longer videos. Quality is good but not quite professional grade for high-end production.',
    receipt_url: 'https://youtube.com/watch?v=stu901&t=634',
    timestamp: '10:34'
  },
  // CapCut reviews
  {
    review_id: 'rev-008',
    tool_id: 'capcut',
    video_id: 'vwx234',
    channel_name: 'Short Form Creator',
    video_title: 'CapCut PC Version is Amazing',
    publish_date: '2026-02-10',
    sentiment: 'Pro',
    tags: ['Pricing', 'UI/UX', 'Output quality'],
    snippet_text: 'Completely free with no watermark. The auto-captions work surprisingly well and the templates are constantly updated.',
    receipt_url: 'https://youtube.com/watch?v=vwx234&t=127',
    timestamp: '2:07'
  },
  {
    review_id: 'rev-009',
    tool_id: 'capcut',
    video_id: 'yza567',
    channel_name: 'TikTok Growth Tips',
    video_title: 'CapCut Hidden Features',
    publish_date: '2026-02-06',
    sentiment: 'Pro',
    tags: ['Speed', 'Relevance'],
    snippet_text: 'Effects and transitions are optimized for TikTok and Reels. You can create trending-style videos in minutes.',
    receipt_url: 'https://youtube.com/watch?v=yza567&t=298',
    timestamp: '4:58'
  },
  // ElevenLabs reviews
  {
    review_id: 'rev-010',
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
    review_id: 'rev-011',
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
  // Submagic reviews
  {
    review_id: 'rev-012',
    tool_id: 'submagic',
    video_id: 'hij456',
    channel_name: 'Video Marketing Pro',
    video_title: 'Best Caption Tools for 2026',
    publish_date: '2026-02-06',
    sentiment: 'Pro',
    tags: ['Output quality', 'Speed'],
    snippet_text: 'Submagic generates animated captions fast with high accuracy. The templates look professional and modern.',
    receipt_url: 'https://youtube.com/watch?v=hij456&t=234',
    timestamp: '3:54'
  },
  {
    review_id: 'rev-013',
    tool_id: 'submagic',
    video_id: 'klm789',
    channel_name: 'Creator Tools Review',
    video_title: 'Submagic Honest Review',
    publish_date: '2026-01-29',
    sentiment: 'Con',
    tags: ['Watermark', 'Pricing'],
    snippet_text: 'No free plan - you have to pay to remove the watermark. Subscription is required even for basic features.',
    receipt_url: 'https://youtube.com/watch?v=klm789&t=189',
    timestamp: '3:09'
  },
  // InVideo AI reviews
  {
    review_id: 'rev-014',
    tool_id: 'invideo-ai',
    video_id: 'nop012',
    channel_name: 'AI Video Tools',
    video_title: 'InVideo AI Text-to-Video Test',
    publish_date: '2026-02-04',
    sentiment: 'Pro',
    tags: ['UI/UX', 'Relevance'],
    snippet_text: 'Just type a prompt and it generates a complete video with stock footage, voiceover, and music. Surprisingly good results.',
    receipt_url: 'https://youtube.com/watch?v=nop012&t=356',
    timestamp: '5:56'
  },
  {
    review_id: 'rev-015',
    tool_id: 'invideo-ai',
    video_id: 'qrs345',
    channel_name: 'Digital Creator Daily',
    video_title: 'InVideo AI Limitations',
    publish_date: '2026-01-27',
    sentiment: 'Neutral',
    tags: ['Output quality', 'Other'],
    snippet_text: 'Generated videos are decent but can look generic. Works best as a starting point that you then customize.',
    receipt_url: 'https://youtube.com/watch?v=qrs345&t=421',
    timestamp: '7:01'
  }
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
    offer_size: 'Medium'
  },
  {
    deal_id: 'deal-007',
    tool_id: 'synthesia',
    offer_text: 'Free avatar customization ($99 value)',
    offer_type: 'Credit bonus',
    link_url: 'https://synthesia.io/offer',
    last_seen_date: '2026-02-01',
    receipt_url: 'https://youtube.com/watch?v=tuv678&t=345',
    timestamp: '5:45',
    category: ['UGC Avatars', 'Video Gen/B-roll'],
    offer_size: 'Large'
  },
  {
    deal_id: 'deal-008',
    tool_id: 'pictory',
    offer_text: '15% off annual subscription',
    offer_type: 'Code',
    code: 'SAVE15',
    last_seen_date: '2026-01-28',
    receipt_url: 'https://youtube.com/watch?v=wxy901&t=512',
    timestamp: '8:32',
    category: ['Video Gen/B-roll', 'Scripts/Hooks'],
    offer_size: 'Small'
  },
  {
    deal_id: 'deal-009',
    tool_id: 'veed',
    offer_text: 'Extended 30-day trial',
    offer_type: 'Trial extension',
    link_url: 'https://veed.io/extended-trial',
    last_seen_date: '2026-02-02',
    receipt_url: 'https://youtube.com/watch?v=zab234&t=678',
    timestamp: '11:18',
    category: ['Repurposing', 'Captions'],
    offer_size: 'Medium'
  },
  {
    deal_id: 'deal-010',
    tool_id: 'runway',
    offer_text: '40% off first month',
    offer_type: 'Code',
    code: 'RUNWAY40',
    last_seen_date: '2026-02-03',
    receipt_url: 'https://youtube.com/watch?v=cde567&t=234',
    timestamp: '3:54',
    category: ['Video Gen/B-roll'],
    offer_size: 'Large'
  }
];

// Helper functions
export function getToolById(toolId: string): Tool | undefined {
  return tools.find(t => t.tool_id === toolId);
}

export function getReviewsByToolId(toolId: string): ReviewEvidence[] {
  return reviewEvidence.filter(r => r.tool_id === toolId);
}

export function getDealsByToolId(toolId: string): Deal[] {
  return deals.filter(d => d.tool_id === toolId);
}

export function getToolsByCategory(category: Category): Tool[] {
  return tools.filter(t => t.categories.includes(category));
}

export function getDealsByCategory(category: Category): Deal[] {
  return deals.filter(d => d.category.includes(category));
}

export const categories: Category[] = [
  'Repurposing',
  'UGC Avatars',
  'Captions',
  'Scripts/Hooks',
  'Video Gen/B-roll',
  'Dubbing/Voice'
];

export function getCategorySlug(category: Category): string {
  return category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

export function getCategoryFromSlug(slug: string): Category | undefined {
  return categories.find(c => getCategorySlug(c) === slug);
}

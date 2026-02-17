'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ReviewEvidence, Sentiment, ReviewTag } from '@/lib/types';

interface ReviewsSectionProps {
  reviews: ReviewEvidence[];
}

type SortOption = 'most_recent' | 'oldest';

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const [sentimentFilter, setSentimentFilter] = useState<'All' | Sentiment>('All');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('most_recent');
  const [searchQuery, setSearchQuery] = useState('');

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    reviews.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [reviews]);

  const allChannels = useMemo(() => {
    const channelSet = new Set<string>();
    reviews.forEach((r) => channelSet.add(r.channel_name));
    return Array.from(channelSet).sort();
  }, [reviews]);

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Sentiment filter
    if (sentimentFilter !== 'All') {
      result = result.filter((r) => r.sentiment === sentimentFilter);
    }

    // Tag filter
    if (tagFilter !== 'all') {
      result = result.filter((r) => r.tags.includes(tagFilter as ReviewTag));
    }

    // Channel filter
    if (channelFilter !== 'all') {
      result = result.filter((r) => r.channel_name === channelFilter);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.snippet_text.toLowerCase().includes(q) ||
          r.channel_name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const cmp = a.publish_date.localeCompare(b.publish_date);
      return sortOption === 'most_recent' ? -cmp : cmp;
    });

    return result;
  }, [reviews, sentimentFilter, tagFilter, channelFilter, sortOption, searchQuery]);

  const sentimentOptions: ('All' | Sentiment)[] = ['All', 'Pro', 'Con', 'Neutral'];

  return (
    <div>
      {/* Sentiment Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sentimentOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setSentimentFilter(opt)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              sentimentFilter === opt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Tag Filter */}
        <div className="relative">
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
          >
            <option value="all">Add tag filter...</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Channel Filter */}
        <div className="relative">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
          >
            <option value="all">All reviews</option>
            {allChannels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort:</span>
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="most_recent">Most recent</option>
              <option value="oldest">Oldest</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search within snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Reviews List */}
      {filteredAndSortedReviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No reviews match your filters.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAndSortedReviews.map((review) => (
            <div
              key={review.review_id}
              className="border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors"
            >
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant={
                    review.sentiment === 'Pro'
                      ? 'pro'
                      : review.sentiment === 'Con'
                      ? 'con'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {review.sentiment}
                </Badge>
                {review.tags.map((tag) => (
                  <Badge key={tag} variant="neutral" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Snippet */}
              <p className="text-gray-900 mb-4">{review.snippet_text}</p>

              {/* Footer */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  {review.channel_name} ·{' '}
                  {new Date(review.publish_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href={review.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Receipt ({review.timestamp}) <ExternalLink size={14} />
                  </a>
                  <button className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    ⊘ Report
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="text-center text-sm text-gray-600 pt-4">
            Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
          </div>
        </div>
      )}
    </div>
  );
}

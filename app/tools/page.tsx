'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { tools, getDealsByToolId, categories } from '@/lib/data/mockData';
import type { Category } from '@/lib/types';

type SortField = 'name' | 'evidence' | 'last_seen' | 'pricing';
type SortDirection = 'asc' | 'desc';

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('evidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const pricingOptions = useMemo(() => {
    const unique = new Set(tools.map((t) => t.pricing_model));
    return Array.from(unique).sort();
  }, []);

  const filteredAndSortedTools = useMemo(() => {
    let result = [...tools];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.short_tagline.toLowerCase().includes(q) ||
          t.categories.some((c) => c.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.categories.includes(selectedCategory as Category));
    }

    // Pricing filter
    if (selectedPricing !== 'all') {
      result = result.filter((t) => t.pricing_model === selectedPricing);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'evidence':
          cmp = (a.review_sources_count || 0) - (b.review_sources_count || 0);
          break;
        case 'last_seen':
          cmp = (a.last_seen_review_date || '').localeCompare(b.last_seen_review_date || '');
          break;
        case 'pricing':
          cmp = a.pricing_model.localeCompare(b.pricing_model);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [searchQuery, selectedCategory, selectedPricing, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return (
      <ArrowUpDown
        size={14}
        className="text-blue-600"
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">All Tools</h1>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Pricing Filter */}
            <div className="relative">
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                <option value="all">All pricing</option>
                {pricingOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedTools.length} of {tools.length} tools
          </div>

          {/* Tools Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-6">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Tool <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">
                    Category
                  </th>
                  <th className="pb-3 px-4 hidden sm:table-cell">
                    <button
                      onClick={() => handleSort('pricing')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Pricing <SortIcon field="pricing" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('evidence')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Evidence <SortIcon field="evidence" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('last_seen')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Last seen <SortIcon field="last_seen" />
                    </button>
                  </th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">
                    Deals
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No tools found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTools.map((tool) => {
                    const toolDeals = getDealsByToolId(tool.tool_id);
                    const hasDeals = toolDeals.length > 0;

                    return (
                      <tr key={tool.tool_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 pr-6">
                          <Link href={`/tool/${tool.tool_id}`} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
                              <Image
                                src={tool.logo_url}
                                alt={tool.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 group-hover:text-blue-600">
                                {tool.name}
                              </div>
                              <div className="text-sm text-gray-600 truncate hidden sm:block">
                                {tool.short_tagline}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {tool.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="neutral" size="sm">
                                {cat}
                              </Badge>
                            ))}
                            {tool.categories.length > 2 && (
                              <Badge variant="neutral" size="sm">
                                +{tool.categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden sm:table-cell">
                          {tool.pricing_model}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden lg:table-cell">
                          {tool.review_sources_count || 0} videos
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden lg:table-cell">
                          {tool.last_seen_review_date
                            ? new Date(tool.last_seen_review_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="py-4 pl-4 hidden sm:table-cell">
                          {hasDeals ? (
                            <Link href={`/tool/${tool.tool_id}?tab=deals`}>
                              <Badge variant="blue" size="sm" className="cursor-pointer hover:bg-blue-200">
                                {toolDeals.length} deal{toolDeals.length > 1 ? 's' : ''}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </div>
  );
}

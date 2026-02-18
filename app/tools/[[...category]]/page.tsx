'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, ArrowUpDown, Check as CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import type { Category, Deal, Tool } from '@/lib/types';

type SortField = 'name' | 'reviews' | 'last_seen' | 'pricing';
type SortDirection = 'asc' | 'desc';

function getCategorySlug(category: Category): string {
  return category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

function getCategoryFromSlug(slug: string, categories: Category[]): Category | undefined {
  return categories.find((category) => getCategorySlug(category) === slug);
}

export default function ToolsPage({ params }: { params: { category?: string[] } }) {
  const router = useRouter();
  const categorySlug = params.category?.[0];

  const [tools, setTools] = useState<Tool[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [hasDealsOnly, setHasDealsOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('reviews');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/frontend-data', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch frontend data');
        const data = await response.json() as {
          tools: Tool[];
          deals: Deal[];
          categories: Category[];
        };
        if (!cancelled) {
          setTools(data.tools || []);
          setDeals(data.deals || []);
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategory = useMemo(
    () => (categorySlug ? getCategoryFromSlug(categorySlug, categories) : undefined),
    [categorySlug, categories]
  );

  const pricingOptions = useMemo(() => {
    const unique = new Set(tools.map((tool) => tool.pricing_model));
    return Array.from(unique).sort();
  }, [tools]);

  const dealsByToolId = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach((deal) => {
      map.set(deal.tool_id, (map.get(deal.tool_id) || 0) + 1);
    });
    return map;
  }, [deals]);

  const filteredAndSortedTools = useMemo(() => {
    let result = [...tools];

    if (activeCategory) {
      result = result.filter((tool) => tool.categories.includes(activeCategory));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(q) ||
          tool.short_tagline.toLowerCase().includes(q) ||
          tool.categories.some((category) => category.toLowerCase().includes(q))
      );
    }

    if (selectedPricing !== 'all') {
      result = result.filter((tool) => tool.pricing_model === selectedPricing);
    }

    if (hasDealsOnly) {
      result = result.filter((tool) => (dealsByToolId.get(tool.tool_id) || 0) > 0);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'reviews':
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
  }, [tools, activeCategory, searchQuery, selectedPricing, hasDealsOnly, dealsByToolId, sortField, sortDirection]);

  function handleCategoryChange(value: string) {
    if (value === 'all') {
      router.push('/tools');
    } else {
      router.push(`/tools/${getCategorySlug(value as Category)}`);
    }
  }

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
    return <ArrowUpDown size={14} className="text-blue-600" />;
  }

  const pageTitle = activeCategory ? `${activeCategory} Tools` : 'All Tools';
  const totalCount = activeCategory
    ? tools.filter((tool) => tool.categories.includes(activeCategory)).length
    : tools.length;

  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{pageTitle}</h1>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <div className="relative">
              <select
                value={activeCategory || 'all'}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
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

            <div className="relative">
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                <option value="all">All pricing</option>
                {pricingOptions.map((pricing) => (
                  <option key={pricing} value={pricing}>
                    {pricing}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded bg-white cursor-pointer select-none hover:bg-gray-50 transition-colors">
              <span className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${hasDealsOnly ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {hasDealsOnly && <CheckIcon size={12} className="text-white" />}
              </span>
              <input
                type="checkbox"
                checked={hasDealsOnly}
                onChange={(e) => setHasDealsOnly(e.target.checked)}
                className="sr-only"
              />
              Has deals
            </label>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedTools.length} of {totalCount} tools
          </div>

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
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Category</th>
                  <th className="pb-3 px-4 hidden sm:table-cell">
                    <button
                      onClick={() => handleSort('pricing')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Pricing <SortIcon field="pricing" />
                    </button>
                  </th>
                  <th className="pb-3 px-4">
                    <button
                      onClick={() => handleSort('reviews')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Reviews <SortIcon field="reviews" />
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
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700">Deals</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">Loading tools...</td>
                  </tr>
                ) : filteredAndSortedTools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">No tools found matching your filters.</td>
                  </tr>
                ) : (
                  filteredAndSortedTools.map((tool) => {
                    const toolDealsCount = dealsByToolId.get(tool.tool_id) || 0;
                    const hasDeals = toolDealsCount > 0;

                    return (
                      <tr key={tool.tool_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 pr-6">
                          <Link href={`/tool/${tool.tool_id}`} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
                              <Image src={tool.logo_url} alt={tool.name} fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 group-hover:text-blue-600">{tool.name}</div>
                              <div className="text-sm text-gray-600 truncate hidden sm:block">{tool.short_tagline}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {tool.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="neutral" size="sm">{cat}</Badge>
                            ))}
                            {tool.categories.length > 2 && (
                              <Badge variant="neutral" size="sm">+{tool.categories.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden sm:table-cell">{tool.pricing_model}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{tool.review_sources_count || 0}</td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden lg:table-cell">
                          {tool.last_seen_review_date
                            ? new Date(tool.last_seen_review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '-'}
                        </td>
                        <td className="py-4 pl-4">
                          {hasDeals ? (
                            <Link href={`/tool/${tool.tool_id}?tab=deals`}>
                              <Badge variant="blue" size="sm" className="cursor-pointer hover:bg-blue-100">{toolDealsCount}</Badge>
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

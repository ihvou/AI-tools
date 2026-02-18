'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, ArrowUpDown, ExternalLink, Copy, Check, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { DealBottomSheet } from '@/components/features/DealBottomSheet';
import { ReportIssueModal } from '@/components/features/ReportIssueModal';
import type { Category, Deal, Tool } from '@/lib/types';

type SortField = 'tool' | 'offer' | 'last_seen';
type SortDirection = 'asc' | 'desc';

function getCategorySlug(category: Category): string {
  return category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

function getCategoryFromSlug(slug: string, categories: Category[]): Category | undefined {
  return categories.find((category) => getCategorySlug(category) === slug);
}

export default function DealsPage({ params }: { params: { category?: string[] } }) {
  const router = useRouter();
  const categorySlug = params.category?.[0];

  const [deals, setDeals] = useState<Deal[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfferType, setSelectedOfferType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_seen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedDealId, setCopiedDealId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [reportDealId, setReportDealId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/frontend-data', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch frontend data');
        const data = await response.json() as {
          deals: Deal[];
          tools: Tool[];
          categories: Category[];
        };

        if (!cancelled) {
          setDeals(data.deals || []);
          setTools(data.tools || []);
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

  const toolsById = useMemo(() => {
    const map = new Map<string, Tool>();
    tools.forEach((tool) => map.set(tool.tool_id, tool));
    return map;
  }, [tools]);

  const activeCategory = useMemo(
    () => (categorySlug ? getCategoryFromSlug(categorySlug, categories) : undefined),
    [categorySlug, categories]
  );

  const offerTypeOptions = useMemo(() => {
    const unique = new Set(deals.map((deal) => deal.offer_type));
    return Array.from(unique).sort();
  }, [deals]);

  const filteredAndSortedDeals = useMemo(() => {
    let result = [...deals];

    if (activeCategory) {
      result = result.filter((deal) => deal.category.includes(activeCategory));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((deal) => {
        const tool = toolsById.get(deal.tool_id);
        return (
          deal.offer_text.toLowerCase().includes(q) ||
          (deal.code && deal.code.toLowerCase().includes(q)) ||
          Boolean(tool && tool.name.toLowerCase().includes(q))
        );
      });
    }

    if (selectedOfferType !== 'all') {
      result = result.filter((deal) => deal.offer_type === selectedOfferType);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'tool': {
          const toolA = toolsById.get(a.tool_id);
          const toolB = toolsById.get(b.tool_id);
          cmp = (toolA?.name || '').localeCompare(toolB?.name || '');
          break;
        }
        case 'offer':
          cmp = a.offer_text.localeCompare(b.offer_text);
          break;
        case 'last_seen':
          cmp = a.last_seen_date.localeCompare(b.last_seen_date);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [deals, activeCategory, searchQuery, selectedOfferType, sortField, sortDirection, toolsById]);

  function handleCategoryChange(value: string) {
    if (value === 'all') {
      router.push('/deals');
    } else {
      router.push(`/deals/${getCategorySlug(value as Category)}`);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'tool' ? 'asc' : 'desc');
    }
  }

  function handleCopyCode(dealId: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedDealId(dealId);
    setTimeout(() => setCopiedDealId(null), 2000);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return <ArrowUpDown size={14} className="text-blue-600" />;
  }

  const pageTitle = activeCategory ? `${activeCategory} Deals` : 'All Deals';
  const totalCount = activeCategory
    ? deals.filter((deal) => deal.category.includes(activeCategory)).length
    : deals.length;

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
                placeholder="Search deals..."
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
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedOfferType}
                onChange={(e) => setSelectedOfferType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                <option value="all">All offer types</option>
                {offerTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">Showing {filteredAndSortedDeals.length} of {totalCount} deals</div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-6">
                    <button onClick={() => handleSort('tool')} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Tool <SortIcon field="tool" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 hidden sm:table-cell">
                    <button onClick={() => handleSort('offer')} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Offer <SortIcon field="offer" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700">Code</th>
                  <th className="pb-3 px-4 hidden md:table-cell">
                    <button onClick={() => handleSort('last_seen')} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Last seen <SortIcon field="last_seen" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Receipt</th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700">Claim</th>
                  <th className="pb-3 pl-2 text-sm font-semibold text-gray-700 sm:hidden w-10"><span className="sr-only">More</span></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">Loading deals...</td>
                  </tr>
                ) : filteredAndSortedDeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">No deals found matching your filters.</td>
                  </tr>
                ) : (
                  filteredAndSortedDeals.map((deal) => {
                    const tool = toolsById.get(deal.tool_id);
                    if (!tool) return null;

                    const claimDealUrl = deal.link_url || deal.receipt_url;

                    return (
                      <tr key={deal.deal_id} className="border-b border-gray-100 hover:bg-gray-50 group/row">
                        <td className="py-4 pr-6">
                          <Link href={`/tool/${tool.tool_id}?tab=deals`} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
                              <Image src={tool.logo_url} alt={tool.name} fill className="object-cover" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-600">{tool.name}</span>
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900 hidden sm:table-cell">{deal.offer_text}</td>
                        <td className="py-4 px-4">
                          {deal.code ? (
                            <button onClick={() => handleCopyCode(deal.deal_id, deal.code!)} className="inline-flex items-center gap-1.5 group/copy" title="Click to copy code">
                              <Badge variant="neutral" size="sm" className="cursor-pointer group-hover/copy:bg-gray-200 transition-colors">{deal.code}</Badge>
                              {copiedDealId === deal.deal_id ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} className="text-gray-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                              )}
                            </button>
                          ) : deal.offer_type === 'Link' ? (
                            <Badge variant="neutral" size="sm">Link deal</Badge>
                          ) : (
                            <span className="text-sm text-gray-400">No code</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden md:table-cell">
                          {new Date(deal.last_seen_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-4">
                            <a href={deal.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700">
                              {deal.timestamp} ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => setReportDealId(deal.deal_id)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Report
                            </button>
                          </div>
                        </td>
                        <td className="py-4 pl-4 w-[100px]">
                          <a href={claimDealUrl} target="_blank" rel="noopener noreferrer" className="relative items-center justify-center w-[88px] h-8 hidden sm:inline-flex">
                            <ExternalLink size={16} className="absolute text-gray-400 transition-opacity group-hover/row:opacity-0" />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap">
                              Claim Deal
                            </span>
                          </a>
                          <a href={claimDealUrl} target="_blank" rel="noopener noreferrer" className="sm:hidden inline-flex items-center justify-center w-8 h-8">
                            <ExternalLink size={16} className="text-blue-600" />
                          </a>
                        </td>
                        <td className="py-4 pl-2 sm:hidden">
                          <button onClick={() => setSelectedDeal(deal)} className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
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

      {selectedDeal && (
        <DealBottomSheet
          deal={selectedDeal}
          tool={toolsById.get(selectedDeal.tool_id)!}
          onReport={setReportDealId}
          onClose={() => setSelectedDeal(null)}
        />
      )}

      <ReportIssueModal
        reportType="deal"
        entityId={reportDealId || ''}
        isOpen={Boolean(reportDealId)}
        onClose={() => setReportDealId(null)}
      />
    </div>
  );
}

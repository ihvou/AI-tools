'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, ArrowUpDown, ExternalLink, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { deals, tools, categories, getCategorySlug } from '@/lib/data/mockData';
import type { Category } from '@/lib/types';

type SortField = 'tool' | 'offer' | 'last_seen';
type SortDirection = 'asc' | 'desc';

export default function DealsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfferType, setSelectedOfferType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_seen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedDealId, setCopiedDealId] = useState<string | null>(null);

  const offerTypeOptions = useMemo(() => {
    const unique = new Set(deals.map((d) => d.offer_type));
    return Array.from(unique).sort();
  }, []);

  const filteredAndSortedDeals = useMemo(() => {
    let result = [...deals];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        const tool = tools.find((t) => t.tool_id === d.tool_id);
        return (
          d.offer_text.toLowerCase().includes(q) ||
          (d.code && d.code.toLowerCase().includes(q)) ||
          (tool && tool.name.toLowerCase().includes(q))
        );
      });
    }

    if (selectedOfferType !== 'all') {
      result = result.filter((d) => d.offer_type === selectedOfferType);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'tool': {
          const toolA = tools.find((t) => t.tool_id === a.tool_id);
          const toolB = tools.find((t) => t.tool_id === b.tool_id);
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
  }, [searchQuery, selectedOfferType, sortField, sortDirection]);

  function handleCategoryChange(value: string) {
    if (value !== 'all') {
      const slug = getCategorySlug(value as Category);
      router.push(`/deals/${slug}`);
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

  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">All Deals</h1>

          {/* Search & Filters */}
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
                value="all"
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
                value={selectedOfferType}
                onChange={(e) => setSelectedOfferType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                <option value="all">All offer types</option>
                {offerTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedDeals.length} of {deals.length} deals
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-6">
                    <button
                      onClick={() => handleSort('tool')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Tool <SortIcon field="tool" />
                    </button>
                  </th>
                  <th className="pb-3 px-4">
                    <button
                      onClick={() => handleSort('offer')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Offer <SortIcon field="offer" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Code</th>
                  <th className="pb-3 px-4 hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('last_seen')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Last seen <SortIcon field="last_seen" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Receipt</th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Claim Deal</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No deals found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedDeals.map((deal) => {
                    const tool = tools.find((t) => t.tool_id === deal.tool_id);
                    if (!tool) return null;

                    const claimDealUrl = deal.link_url || deal.receipt_url;

                    return (
                      <tr key={deal.deal_id} className="border-b border-gray-100 hover:bg-gray-50 group/row">
                        <td className="py-4 pr-6">
                          <Link href={`/tool/${tool.tool_id}?tab=deals`} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
                              <Image
                                src={tool.logo_url}
                                alt={tool.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-600">
                              {tool.name}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {deal.offer_text}
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          {deal.code ? (
                            <button
                              onClick={() => handleCopyCode(deal.deal_id, deal.code!)}
                              className="inline-flex items-center gap-1.5 group/copy"
                              title="Click to copy code"
                            >
                              <Badge variant="neutral" size="sm" className="cursor-pointer group-hover/copy:bg-gray-200 transition-colors">
                                {deal.code}
                              </Badge>
                              {copiedDealId === deal.deal_id ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} className="text-gray-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                              )}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">No code</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 hidden lg:table-cell">
                          {new Date(deal.last_seen_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
                          <a
                            href={deal.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {deal.timestamp} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td className="py-4 pl-4 hidden sm:table-cell w-[100px]">
                          <a
                            href={claimDealUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative inline-flex items-center justify-center w-[88px] h-8"
                          >
                            <ExternalLink size={16} className="absolute text-gray-400 transition-opacity group-hover/row:opacity-0" />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap">
                              Claim Deal
                            </span>
                          </a>
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DealBottomSheet } from '@/components/features/DealBottomSheet';
import { tools } from '@/lib/data/mockData';
import type { Deal } from '@/lib/types';

interface DealsPreviewTableProps {
  deals: Deal[];
}

export function DealsPreviewTable({ deals }: DealsPreviewTableProps) {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-6 text-sm font-semibold text-gray-700">Tool</th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Offer</th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700">Code</th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Last seen</th>
              <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Receipt</th>
              <th className="pb-3 pl-4 text-sm font-semibold text-gray-700">
                Claim
              </th>
              {/* Mobile ellipsis column */}
              <th className="pb-3 pl-2 text-sm font-semibold text-gray-700 sm:hidden w-10">
                <span className="sr-only">More</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => {
              const tool = tools.find((t) => t.tool_id === deal.tool_id);
              if (!tool) return null;

              const claimDealUrl = deal.link_url || deal.receipt_url;

              return (
                <tr key={deal.deal_id} className="border-b border-gray-100 hover:bg-gray-50">
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
                  <td className="py-4 px-4 text-sm text-gray-900 hidden sm:table-cell">
                    {deal.offer_text}
                  </td>
                  <td className="py-4 px-4">
                    {deal.code ? (
                      <Badge variant="neutral" size="sm">{deal.code}</Badge>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 hidden md:table-cell">
                    {new Date(deal.last_seen_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 pl-4 hidden md:table-cell">
                    <a
                      href={deal.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {deal.timestamp} ↗
                    </a>
                  </td>
                  <td className="py-4 pl-4">
                    {/* Desktop: link icon */}
                    <a
                      href={claimDealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8"
                    >
                      <ExternalLink size={16} className="text-blue-600" />
                    </a>
                  </td>
                  {/* Mobile ellipsis */}
                  <td className="py-4 pl-2 sm:hidden">
                    <button
                      onClick={() => setSelectedDeal(deal)}
                      className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Bottom Sheet */}
      {selectedDeal && (
        <DealBottomSheet
          deal={selectedDeal}
          tool={tools.find((t) => t.tool_id === selectedDeal.tool_id)!}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Check, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DealBottomSheet } from '@/components/features/DealBottomSheet';
import { ReportIssueModal } from '@/components/features/ReportIssueModal';
import type { Deal, Tool } from '@/lib/types';

interface DealsTableProps {
  deals: Deal[];
  tools: Tool[];
}

export function DealsTable({ deals, tools }: DealsTableProps) {
  const [copiedDealId, setCopiedDealId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [reportDealId, setReportDealId] = useState<string | null>(null);

  function handleCopyCode(dealId: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedDealId(dealId);
    setTimeout(() => setCopiedDealId(null), 2000);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-6 text-sm font-semibold text-gray-700">Offer</th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700">
                Code
              </th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">
                Last seen
              </th>
              <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Receipt</th>
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
              const claimDealUrl = deal.link_url || deal.receipt_url;
              const tool = tools.find((t) => t.tool_id === deal.tool_id);

              return (
                <tr key={deal.deal_id} className="border-b border-gray-100 group/row hover:bg-gray-50">
                  <td className="py-4 pr-6 text-sm text-gray-900">{deal.offer_text}</td>
                  <td className="py-4 px-4">
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
                    ) : deal.offer_type === 'Link' ? (
                      <Badge variant="neutral" size="sm">Link deal</Badge>
                    ) : (
                      <span className="text-sm text-gray-400">No code</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 hidden md:table-cell">
                    {new Date(deal.last_seen_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-4 hidden md:table-cell">
                    <div className="flex items-center gap-4">
                      <a
                        href={deal.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {deal.timestamp} <ExternalLink size={14} />
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
                    <a
                      href={claimDealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative items-center justify-center w-[88px] h-8 hidden sm:inline-flex"
                    >
                      <ExternalLink size={16} className="absolute text-gray-400 transition-opacity group-hover/row:opacity-0" />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap">
                        Claim Deal
                      </span>
                    </a>
                    {/* Mobile: just the icon */}
                    <a
                      href={claimDealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm:hidden inline-flex items-center justify-center w-8 h-8"
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
    </>
  );
}

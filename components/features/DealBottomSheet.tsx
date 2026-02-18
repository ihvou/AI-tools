'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Deal, Tool } from '@/lib/types';

interface DealBottomSheetProps {
  deal: Deal;
  tool: Tool;
  onClose: () => void;
  onReport?: (dealId: string) => void;
}

export function DealBottomSheet({ deal, tool, onClose, onReport }: DealBottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Trigger slide-up animation
    requestAnimationFrame(() => setIsVisible(true));
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }

  function handleCopyCode() {
    if (deal.code) {
      navigator.clipboard.writeText(deal.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const claimDealUrl = deal.link_url || deal.receipt_url;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${isVisible ? 'opacity-40' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
              <Image
                src={tool.logo_url}
                alt={tool.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{tool.name}</h3>
              <p className="text-xs text-gray-500">{tool.pricing_model}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Offer */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Offer</label>
            <p className="text-sm text-gray-900 mt-1">{deal.offer_text}</p>
          </div>

          {/* Offer type + Code row */}
          <div className="flex gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
              <p className="text-sm text-gray-900 mt-1">{deal.offer_type}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Code</label>
              <div className="mt-1">
                {deal.code ? (
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Badge variant="neutral" size="sm" className="cursor-pointer hover:bg-gray-200 transition-colors">
                      {deal.code}
                    </Badge>
                    {copied ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} className="text-gray-400" />
                    )}
                  </button>
                ) : deal.offer_type === 'Link' ? (
                  <Badge variant="neutral" size="sm">Link deal</Badge>
                ) : (
                  <span className="text-sm text-gray-400">No code</span>
                )}
              </div>
            </div>
          </div>

          {/* Last seen + Receipt row */}
          <div className="flex gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last seen</label>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(deal.last_seen_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt</label>
              <div className="mt-1">
                <a
                  href={deal.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  {deal.timestamp} <ExternalLink size={12} />
                </a>
              </div>
            </div>
            {onReport && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Report</label>
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => onReport(deal.deal_id)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Report issue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pt-4 border-t border-gray-100">
          <a
            href={claimDealUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Claim Deal <ExternalLink size={14} />
          </a>
          {/* Spacer for safe area + extra breathing room */}
          <div className="h-6 pb-safe" />
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { tools, deals, categories, getDealsByToolId } from '@/lib/data/mockData';
import type { CategoryInfo } from '@/lib/types';

export default function HomePage() {
  const previewTools = tools.slice(0, 8);
  const previewDeals = deals.slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gray-50 border-b border-gray-200">
        <Container>
          <div className="py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              AI Video Ads Hub
            </h1>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl">
              Find AI video ad tools and promo offers backed by YouTube timestamp receipts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/tools">
                <Button variant="primary" size="lg">
                  Browse tools
                </Button>
              </Link>
              <Link href="/deals">
                <Button variant="secondary" size="lg">
                  See deals
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        {/* Tools Preview */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Tools</h2>
            <Link
              href="/tools"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all tools
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-6 text-sm font-semibold text-gray-700">Tool</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">
                    Category
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">
                    Pricing
                  </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">
                    Evidence
                  </th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">
                    Deals
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewTools.map((tool) => {
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
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Deals Preview */}
        <section className="py-12 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Deals</h2>
            <Link
              href="/deals"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all deals
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-6 text-sm font-semibold text-gray-700">Tool</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700">Offer</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Code</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">Last seen</th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {previewDeals.map((deal) => {
                  const tool = tools.find((t) => t.tool_id === deal.tool_id);
                  if (!tool) return null;

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
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {deal.offer_text}
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        {deal.code ? (
                          <Badge variant="neutral" size="sm">{deal.code}</Badge>
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
                      <td className="py-4 pl-4 hidden sm:table-cell">
                        <a
                          href={deal.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {deal.timestamp} ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Categories */}
        <section className="py-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(categories as unknown as CategoryInfo[]).map((category) => (
              <div
                key={category.slug}
                className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {category.tools_count} tools • {category.deals_count} deals
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/tools/category/${category.slug}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Tools in {category.name}
                    <ChevronRight size={14} />
                  </Link>
                  <Link
                    href={`/deals/category/${category.slug}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Deals in {category.name}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}

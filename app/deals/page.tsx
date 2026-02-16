import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { deals, tools } from '@/lib/data/mockData';

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">All Deals</h1>

          {/* Filters will be added in next iteration */}
          <div className="mb-6 text-sm text-gray-600">
            Showing {deals.length} deals
          </div>

          {/* Deals Table */}
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
                {deals.map((deal) => {
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
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
        </div>
      </Container>
    </div>
  );
}

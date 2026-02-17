import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { tools, getDealsByToolId, categories, getCategorySlug, getCategoryFromSlug } from '@/lib/data/mockData';

export async function generateStaticParams() {
  return categories.map((cat) => ({
    category: getCategorySlug(cat),
  }));
}

export default function ToolsCategoryPage({ params }: { params: { category: string } }) {
  const category = getCategoryFromSlug(params.category);

  if (!category) {
    notFound();
  }

  const filteredTools = tools.filter((t) => t.categories.includes(category));

  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12">
          <div className="mb-6">
            <Link
              href="/tools"
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-4"
            >
              <ChevronLeft size={14} />
              All Tools
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {category} Tools
            </h1>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredTools.length} tools in {category}
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
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">
                    Last seen
                  </th>
                  <th className="pb-3 pl-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">
                    Deals
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTools.map((tool) => {
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
                            <Badge variant="blue" size="sm" className="cursor-pointer hover:bg-blue-100">
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
        </div>
      </Container>
    </div>
  );
}

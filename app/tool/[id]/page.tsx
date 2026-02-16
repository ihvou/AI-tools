import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { tools, reviewEvidence, deals, getReviewsByToolId, getDealsByToolId } from '@/lib/data/mockData';

export async function generateStaticParams() {
  return tools.map((tool) => ({
    id: tool.tool_id,
  }));
}

export default function ToolDetailPage({ params }: { params: { id: string } }) {
  const tool = tools.find((t) => t.tool_id === params.id);

  if (!tool) {
    notFound();
  }

  const reviews = getReviewsByToolId(tool.tool_id);
  const toolDeals = getDealsByToolId(tool.tool_id);

  return (
    <div className="min-h-screen bg-white">
      {/* Tool Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <Container>
          <div className="py-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Left: Tool Info */}
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex-shrink-0 relative overflow-hidden">
                <Image
                  src={tool.logo_url}
                  alt={tool.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{tool.name}</h1>
                <p className="text-gray-600 mb-3">{tool.short_tagline}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {tool.categories.map((cat) => (
                      <Badge key={cat} variant="blue" size="sm">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <span>•</span>
                  <span>{tool.pricing_model}</span>
                  {tool.platforms && (
                    <>
                      <span>•</span>
                      <span>{tool.platforms.join(', ')}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{tool.review_sources_count || 0} videos indexed</span>
                  {tool.last_seen_review_date && (
                    <>
                      <span>•</span>
                      <span>
                        Last seen{' '}
                        {new Date(tool.last_seen_review_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex flex-col gap-2">
              <a href={tool.website_url} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="lg" className="w-full md:w-auto">
                  Go to official site
                  <ExternalLink size={16} className="ml-2" />
                </Button>
              </a>
              {toolDeals.length > 0 && (
                <Link
                  href={`/tool/${tool.tool_id}?tab=deals`}
                  className="text-sm text-blue-600 hover:text-blue-700 text-center md:text-right"
                >
                  Open deals tab
                </Link>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Tabs */}
      <Container>
        <Tabs defaultValue="reviews" className="py-8">
          <TabsList>
            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals ({toolDeals.length})
            </TabsTrigger>
          </TabsList>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No reviews found for this tool yet.
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div
                    key={review.review_id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                  >
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant={
                          review.sentiment === 'Pro'
                            ? 'pro'
                            : review.sentiment === 'Con'
                            ? 'con'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {review.sentiment}
                      </Badge>
                      {review.tags.map((tag) => (
                        <Badge key={tag} variant="neutral" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Snippet */}
                    <p className="text-gray-900 mb-4">{review.snippet_text}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        {review.channel_name} •{' '}
                        {new Date(review.publish_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-4">
                        <a
                          href={review.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          Receipt ({review.timestamp}) <ExternalLink size={14} />
                        </a>
                        <button className="text-gray-500 hover:text-gray-700">
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center text-sm text-gray-600 pt-4">
                  Showing {reviews.length} of {reviews.length} reviews
                </div>
              </div>
            )}
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals">
            {toolDeals.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No deals found for this tool yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-3 pr-6 text-sm font-semibold text-gray-700">Offer</th>
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">
                        Code
                      </th>
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">
                        Last seen
                      </th>
                      <th className="pb-3 pl-4 text-sm font-semibold text-gray-700">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolDeals.map((deal) => (
                      <tr key={deal.deal_id} className="border-b border-gray-100">
                        <td className="py-4 pr-6 text-sm text-gray-900">{deal.offer_text}</td>
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
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-4">
                            <a
                              href={deal.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              {deal.timestamp} <ExternalLink size={14} />
                            </a>
                            <button className="text-sm text-gray-500 hover:text-gray-700">
                              Report
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}

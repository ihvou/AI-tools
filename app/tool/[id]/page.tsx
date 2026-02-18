import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ToolDetailTabs } from '@/components/features/ToolDetailTabs';
import { getAppData } from '@/lib/server/backendData';

export async function generateStaticParams() {
  const { tools } = await getAppData();
  return tools.map((tool) => ({
    id: tool.tool_id,
  }));
}

export default async function ToolDetailPage({ params }: { params: { id: string } }) {
  const { tools, reviews: allReviews, deals: allDeals } = await getAppData();
  const tool = tools.find((t) => t.tool_id === params.id);

  if (!tool) {
    notFound();
  }

  const reviews = allReviews.filter((review) => review.tool_id === tool.tool_id);
  const toolDeals = allDeals.filter((deal) => deal.tool_id === tool.tool_id);

  return (
    <div className="min-h-screen bg-white">
      {/* Tool Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <Container>
          <div className="py-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Left: Tool Info */}
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 rounded bg-white border border-gray-200 flex-shrink-0 relative overflow-hidden">
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
                  <span>{reviews.length} reviews</span>
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
        <Suspense fallback={<div className="py-8">Loading...</div>}>
          <ToolDetailTabs reviews={reviews} deals={toolDeals} tools={tools} />
        </Suspense>
      </Container>
    </div>
  );
}

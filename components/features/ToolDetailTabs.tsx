'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ReviewsSection } from '@/components/features/ReviewsSection';
import { DealsTable } from '@/components/features/DealsTable';
import type { ReviewEvidence, Deal } from '@/lib/types';

interface ToolDetailTabsProps {
  reviews: ReviewEvidence[];
  deals: Deal[];
}

export function ToolDetailTabs({ reviews, deals }: ToolDetailTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'deals' ? 'deals' : 'reviews';

  return (
    <Tabs defaultValue={activeTab} className="py-8">
      <TabsList>
        <TabsTrigger value="reviews">
          Reviews ({reviews.length})
        </TabsTrigger>
        <TabsTrigger value="deals">
          Deals ({deals.length})
        </TabsTrigger>
      </TabsList>

      {/* Reviews Tab */}
      <TabsContent value="reviews">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No reviews found for this tool yet.
          </div>
        ) : (
          <ReviewsSection reviews={reviews} />
        )}
      </TabsContent>

      {/* Deals Tab */}
      <TabsContent value="deals">
        {deals.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No deals found for this tool yet.
          </div>
        ) : (
          <DealsTable deals={deals} />
        )}
      </TabsContent>
    </Tabs>
  );
}

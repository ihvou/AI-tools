import { Container } from '@/components/ui/Container';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Container>
        <div className="py-12 max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Methodology</h1>

          <div className="prose prose-gray">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Collect Data</h2>
              <p className="text-gray-600 mb-4">
                All tools, reviews, and deals in our directory are sourced from publicly available YouTube video content. 
                We analyze video metadata, descriptions, and transcripts to extract mentions of AI video ad tools and related promotional offers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Are "Receipts"?</h2>
              <p className="text-gray-600 mb-4">
                Every review snippet and deal in our directory includes a "receipt" - a direct link to the exact timestamp 
                in a YouTube video where that claim or offer was mentioned. This provides transparency and allows you to 
                verify the information yourself.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sources</h2>
              <p className="text-gray-600 mb-4">
                We only include information that can be reliably obtained from:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>YouTube video metadata (title, channel, publish date)</li>
                <li>Video descriptions (often containing promo codes and links)</li>
                <li>Video transcripts and captions (for review snippets)</li>
                <li>Tool aggregators and directories (for basic tool information)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitations</h2>
              <p className="text-gray-600 mb-4">
                Please note:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Some creators may be sponsored, which could influence their opinions</li>
                <li>Promotional codes may expire or have limited availability</li>
                <li>Tool features and pricing may change after a video is published</li>
                <li>Transcript accuracy depends on YouTube's automatic captioning</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Report Issues</h2>
              <p className="text-gray-600 mb-4">
                If you find incorrect information, expired deals, or broken links, please use the "Report" button 
                on any review or deal to let us know. We regularly review and update our data based on community feedback.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}

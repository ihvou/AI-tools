import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <Container>
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Browse */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Browse</h3>
              <div className="flex flex-col gap-2">
                <Link href="/tools" className="text-gray-600 hover:text-gray-900">
                  Tools
                </Link>
                <Link href="/deals" className="text-gray-600 hover:text-gray-900">
                  Deals
                </Link>
              </div>
            </div>

            {/* About */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <div className="flex flex-col gap-2">
                <Link href="/methodology" className="text-gray-600 hover:text-gray-900">
                  Methodology
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-gray-900">
                  Contact
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                  Privacy
                </Link>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                  Terms
                </Link>
              </div>
            </div>
          </div>

          {/* Helper text */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Receipts link to the timestamp where a claim or offer is mentioned. Data is sourced from YouTube video metadata, descriptions, and transcripts.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

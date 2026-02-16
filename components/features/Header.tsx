'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Container } from '@/components/ui/Container';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <Container>
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 text-gray-900 hover:text-gray-700"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">AV</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">AI Video Ads Hub</span>
            <span className="font-semibold text-base sm:hidden">AVAH</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/tools" className="text-gray-700 hover:text-gray-900 font-medium">
              Tools
            </Link>
            <Link href="/deals" className="text-gray-700 hover:text-gray-900 font-medium">
              Deals
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-gray-900 -mr-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </Container>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <Container>
            <nav className="py-4 flex flex-col gap-1">
              <Link
                href="/tools"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium py-3 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tools
              </Link>
              <Link
                href="/deals"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium py-3 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Deals
              </Link>
              <Link
                href="/methodology"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Methodology
              </Link>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}

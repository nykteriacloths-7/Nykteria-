import { useState } from 'react';
import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface HeaderProps {
  bagCount: number;
  onOpenReservation: () => void;
  onOpenOrderStatus: () => void;
}

const NAV_LINKS = [
  { label: 'Release 01', href: '#release-stage' },
  { label: '3D Stage', href: '#garment-stage' },
  { label: 'Craft & Fit', href: '#craft-fit' },
  { label: 'Archive', href: '#upcoming-archive' },
];

export function Header({ bagCount, onOpenReservation, onOpenOrderStatus }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-[#F3F2F0]/10 bg-[#070709]/82 backdrop-blur-xl">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="#top"
          className="font-display text-lg sm:text-xl font-semibold tracking-[0.24em] text-[#F3F2F0] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
        >
          NYKTERIA
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A1AA]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-1 hover:text-[#F3F2F0] transition-colors duration-200 whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[1px] after:w-0 after:bg-[#8B7CA8] hover:after:w-full after:transition-all after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onOpenOrderStatus();
            }}
            className="relative py-1 hover:text-[#F3F2F0] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[1px] after:w-0 after:bg-[#8B7CA8] hover:after:w-full after:transition-all after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
          >
            Order Status
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            key={bagCount}
            initial={bagCount > 0 ? { scale: 0.94 } : false}
            animate={{ scale: 1 }}
            transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onOpenReservation();
            }}
            className="px-4 py-2 text-xs font-semibold tracking-[0.08em] uppercase bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] transition-colors duration-200 whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
          >
            {bagCount > 0 ? `Reserve (${bagCount})` : 'Reserve'}
          </motion.button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 text-[#F3F2F0] border border-[#F3F2F0]/15 bg-[#101014] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#F3F2F0]/10 bg-[#070709] px-4 py-4 flex flex-col gap-2"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium text-[#F3F2F0] border-b border-[#F3F2F0]/5 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setMobileMenuOpen(false);
              onOpenOrderStatus();
            }}
            className="py-3 px-2 text-left text-sm font-medium text-[#A796C9] whitespace-nowrap cursor-pointer"
          >
            Order Status
          </button>
        </nav>
      )}
    </header>
  );
}

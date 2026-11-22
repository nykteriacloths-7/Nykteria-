import { useState } from 'react';
import { Lock } from 'lucide-react';
import { OrderReservation, OrderStatus, Product } from '../types';
import { OwnerAdminPanel } from './OwnerAdminPanel';
import { triggerHaptic } from '../utils/haptics';

interface FooterAdminSectionProps {
  products: Product[];
  orders: OrderReservation[];
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onCreateTestOrder: () => OrderReservation;
  onOpenOrderStatus: () => void;
  onResetDefaults: () => void;
}

export function FooterAdminSection({
  products,
  orders,
  reducedMotion,
  onToggleReducedMotion,
  onUpdateProduct,
  onAddProduct,
  onRemoveProduct,
  onUpdateOrderStatus,
  onCreateTestOrder,
  onOpenOrderStatus,
  onResetDefaults,
}: FooterAdminSectionProps) {
  const [adminOpen, setAdminOpen] = useState(false);

  const handleToggleAdmin = () => {
    triggerHaptic('tap');
    setAdminOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          document
            .getElementById('owner-admin-console')
            ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        }, 60);
      }
      return next;
    });
  };

  return (
    <footer className="bg-[#0f0f15] pt-16 pb-12">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#F3F2F0]/10">
          <div className="md:col-span-6">
            <span className="font-display text-xl font-semibold tracking-[0.24em] text-[#F3F2F0]">
              NYKTERIA
            </span>
            <p className="mt-4 text-sm text-[#A1A1AA] max-w-md leading-relaxed">
              Independent dark gothic minimalist streetwear. Engineered in small numbered phases—one
              silhouette at a time.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5 text-sm">
            <p className="text-xs tracking-[0.16em] uppercase text-[#F3F2F0] mb-3">
              Navigation
            </p>
            <div>
              <a href="#release-stage" className="text-[#A1A1AA] hover:text-[#F3F2F0]">
                Release 01
              </a>
            </div>
            <div>
              <a href="#garment-stage" className="text-[#A1A1AA] hover:text-[#F3F2F0]">
                3D Garment Stage
              </a>
            </div>
            <div>
              <a href="#craft-fit" className="text-[#A1A1AA] hover:text-[#F3F2F0]">
                Craft & Fit Matrix
              </a>
            </div>
            <div>
              <a href="#upcoming-archive" className="text-[#A1A1AA] hover:text-[#F3F2F0]">
                Locked Archive
              </a>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onOpenOrderStatus();
                }}
                className="text-[#A1A1AA] hover:text-[#F3F2F0] transition-colors cursor-pointer text-left"
              >
                Order Status
              </button>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3 text-sm">
            <p className="text-xs tracking-[0.16em] uppercase text-[#F3F2F0] mb-3">
              Preferences
            </p>
            <button
              type="button"
              onClick={onToggleReducedMotion}
              className="w-full text-left px-3.5 py-2.5 border border-[#F3F2F0]/15 bg-[#101014] text-xs text-[#F3F2F0] hover:border-[#8B7CA8] transition-colors cursor-pointer"
            >
              Motion: {reducedMotion ? 'Reduced (Safe)' : 'Smooth 3D'}
            </button>
          </div>
        </div>

        {/* Bottom Copyright & Discreet Owner Access */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#A1A1AA]">
          <p>© {new Date().getFullYear()} NYKTERIA. All rights reserved.</p>

          <button
            type="button"
            onClick={handleToggleAdmin}
            aria-expanded={adminOpen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] tracking-[0.14em] uppercase text-[#71717A] hover:text-[#F3F2F0] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
          >
            <Lock className="w-3 h-3 text-[#8B7CA8]/80" />
            <span>{adminOpen ? 'Close Owner Access' : 'Owner Access'}</span>
          </button>
        </div>

        {/* Bottom Owner Admin Console Drawer */}
        {adminOpen && (
          <OwnerAdminPanel
            products={products}
            orders={orders}
            onUpdateProduct={onUpdateProduct}
            onAddProduct={onAddProduct}
            onRemoveProduct={onRemoveProduct}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onCreateTestOrder={onCreateTestOrder}
            onResetDefaults={onResetDefaults}
            onClosePanel={() => setAdminOpen(false)}
          />
        )}
      </div>
    </footer>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNykteriaStore } from './hooks/useNykteriaStore';
import { CartReservationItem, GarmentSize, Product } from './types';
import { getEffectivePrice } from './utils/pricing';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { GarmentStageSection } from './components/GarmentStageSection';
import { CraftFitSection } from './components/CraftFitSection';
import { UpcomingArchiveSection } from './components/UpcomingArchiveSection';
import { FooterAdminSection } from './components/FooterAdminSection';
import { ReservationDrawer } from './components/ReservationDrawer';
import { ReservationToast, ToastPayload } from './components/ReservationToast';
import { OrderStatusModal } from './components/OrderStatusModal';
import { NykteriaCursor } from './components/NykteriaCursor';
import { AmbientAudioToggle } from './components/AmbientAudioToggle';

interface BagSelection {
  productId: string;
  size: GarmentSize;
  quantity: number;
}

export default function App() {
  const {
    products,
    orders,
    reducedMotion,
    setReducedMotion,
    updateProduct,
    addProduct,
    removeProduct,
    resetProductsToDefault,
    addOrderReservation,
    updateOrderStatus,
  } = useNykteriaStore();

  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const pieceParam = new URLSearchParams(window.location.search).get('piece');
      if (pieceParam && products.some((p) => p.id === pieceParam)) {
        return pieceParam;
      }
    }
    return products[0]?.id ?? '';
  });
  const [bagSelections, setBagSelections] = useState<BagSelection[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderStatusOpen, setOrderStatusOpen] = useState(false);
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pieceParam = new URLSearchParams(window.location.search).get('piece');
    if (pieceParam && products.some((p) => p.id === pieceParam)) {
      const timer = window.setTimeout(() => {
        document
          .getElementById('garment-stage')
          ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedProductId)) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Synchronize live prices & discounts from Admin directly into Reservation Bag
  const bagItems: CartReservationItem[] = useMemo(() => {
    return bagSelections
      .map((sel) => {
        const product = products.find((p) => p.id === sel.productId);
        if (!product) return null;
        const pricing = getEffectivePrice(product);
        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          size: sel.size,
          quantity: sel.quantity,
          unitPriceInr: pricing.originalPrice,
          discountPercent: pricing.hasDiscount ? product.discountPercent : 0,
          finalUnitPriceInr: pricing.finalPrice,
          thumbnail: product.frontImage,
        };
      })
      .filter((item): item is CartReservationItem => item !== null);
  }, [bagSelections, products]);

  const totalBagCount = bagItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleReserveItem = useCallback(
    (product: Product, size: GarmentSize, quantity: number) => {
      const pricing = getEffectivePrice(product);
      setBagSelections((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => entry.productId === product.id && entry.size === size
        );
        if (existingIndex >= 0) {
          return prev.map((entry, idx) =>
            idx === existingIndex
              ? { ...entry, quantity: Math.min(10, entry.quantity + quantity) }
              : entry
          );
        }
        return [...prev, { productId: product.id, size, quantity }];
      });

      setToast({
        id: Date.now(),
        productName: product.name,
        shortName: product.shortName,
        size,
        quantity,
        unitPriceInr: pricing.finalPrice,
        thumbnail: product.frontImage,
      });
    },
    []
  );

  const handleUpdateQuantity = (productId: string, size: GarmentSize, delta: number) => {
    setBagSelections((prev) =>
      prev
        .map((entry) =>
          entry.productId === productId && entry.size === size
            ? { ...entry, quantity: entry.quantity + delta }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string, size: GarmentSize) => {
    setBagSelections((prev) =>
      prev.filter((entry) => !(entry.productId === productId && entry.size === size))
    );
  };

  const handleDismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleOpenOrderStatus = useCallback((orderId?: string) => {
    if (orderId) {
      setLookupOrderId(orderId);
    }
    setOrderStatusOpen(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070709] text-[#F3F2F0] flex flex-col">
      <NykteriaCursor reducedMotion={reducedMotion} />

      {/* Subtle matte editorial grain */}
      <div aria-hidden="true" className="fixed inset-0 z-30 nyx-grain-overlay" />

      <Header
        bagCount={totalBagCount}
        onOpenReservation={() => setDrawerOpen(true)}
        onOpenOrderStatus={() => handleOpenOrderStatus()}
      />

      <main className="flex-1">
        <div className="nyx-snap-section">
          <HeroSection
            activePieceCount={products.length}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="nyx-snap-section">
          <GarmentStageSection
            products={products}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            reducedMotion={reducedMotion}
            bagCount={totalBagCount}
            onReserveItem={handleReserveItem}
            onOpenBag={() => setDrawerOpen(true)}
          />
        </div>

        <div className="nyx-snap-section">
          <CraftFitSection reducedMotion={reducedMotion} />
        </div>

        <div className="nyx-snap-section">
          <UpcomingArchiveSection
            activePieceCount={products.length}
            reducedMotion={reducedMotion}
          />
        </div>
      </main>

      <div className="nyx-snap-section">
        <FooterAdminSection
          products={products}
          orders={orders}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
          onUpdateProduct={updateProduct}
          onAddProduct={addProduct}
          onRemoveProduct={removeProduct}
          onUpdateOrderStatus={updateOrderStatus}
          onOpenOrderStatus={() => handleOpenOrderStatus()}
          onResetDefaults={resetProductsToDefault}
        />
      </div>

      <AmbientAudioToggle reducedMotion={reducedMotion} />

      <ReservationToast
        toast={toast}
        reducedMotion={reducedMotion}
        onDismiss={handleDismissToast}
        onOpenBag={() => setDrawerOpen(true)}
      />

      <ReservationDrawer
        open={drawerOpen}
        reducedMotion={reducedMotion}
        onClose={() => setDrawerOpen(false)}
        items={bagItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearBag={() => setBagSelections([])}
        onSubmitReservation={addOrderReservation}
        onTrackOrder={(orderId) => handleOpenOrderStatus(orderId)}
      />

      <OrderStatusModal
        open={orderStatusOpen}
        onClose={() => setOrderStatusOpen(false)}
        orders={orders}
        initialOrderId={lookupOrderId}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

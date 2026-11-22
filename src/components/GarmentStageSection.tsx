import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Check, ShieldCheck, ShoppingBag, Ruler, Share2 } from 'lucide-react';
import { GarmentSize, GarmentViewAngle, Product } from '../types';
import { formatInr, getEffectivePrice } from '../utils/pricing';
import { InteractiveGarment3D } from './InteractiveGarment3D';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { CinematicSectionReveal } from './CinematicSectionReveal';
import { SizeGuideModal } from './SizeGuideModal';
import { ShareDropModal } from './ShareDropModal';
import { triggerHaptic } from '../utils/haptics';

interface GarmentStageSectionProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  reducedMotion: boolean;
  bagCount: number;
  onReserveItem: (product: Product, size: GarmentSize, quantity: number) => void;
  onOpenBag: () => void;
}

const ALL_SIZES: GarmentSize[] = ['S', 'M', 'L', 'XL'];
const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

type DetailTab = 'artwork' | 'fabric' | 'care';

interface TiltProductCardProps {
  item: Product;
  isSelected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
}

function TiltProductCard({
  item,
  isSelected,
  reducedMotion,
  onSelect,
}: TiltProductCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const itemPricing = getEffectivePrice(item);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (imageWrapRef.current) {
      const imgRect = imageWrapRef.current.getBoundingClientRect();
      const xPct = Math.max(0, Math.min(100, ((e.clientX - imgRect.left) / imgRect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((e.clientY - imgRect.top) / imgRect.height) * 100));
      imageWrapRef.current.style.setProperty('--spot-x', `${xPct.toFixed(1)}%`);
      imageWrapRef.current.style.setProperty('--spot-y', `${yPct.toFixed(1)}%`);
      imageWrapRef.current.style.setProperty('--spot-opacity', '1');
    }

    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const rx = (-ny * 5.5).toFixed(2);
    const ry = (nx * 6.5).toFixed(2);
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0, -3px, 0)`;
  };

  const handlePointerLeave = () => {
    setHovered(false);
    if (imageWrapRef.current) {
      imageWrapRef.current.style.setProperty('--spot-opacity', '0');
    }
    if (cardRef.current) {
      cardRef.current.style.transform =
        'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
    }
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onSelect}
      onPointerEnter={() => {
        setHovered(true);
        imageWrapRef.current?.style.setProperty('--spot-opacity', '1');
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ transition: 'transform 260ms cubic-bezier(0.19, 1, 0.22, 1), border-color 220ms ease' }}
      className={`group text-left flex flex-col border will-change-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
        isSelected
          ? 'border-[#8B7CA8] bg-[#101014] shadow-[0_24px_60px_rgba(0,0,0,0.65)]'
          : 'border-[#F3F2F0]/10 bg-[#101014]/65 hover:border-[#F3F2F0]/28'
      }`}
    >
      <div
        ref={imageWrapRef}
        data-cursor="garment"
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#08080b] p-3"
      >
        {/* Pulsing Editorial Aura Behind Garment */}
        <div
          aria-hidden="true"
          className="absolute inset-0 nyx-garment-aura"
        />

        {/* Framed Garment Image Container */}
        <div className="relative z-10 w-full h-full overflow-hidden bg-[#0c0c10] border border-[#F3F2F0]/[0.08]">
          {/* Front Image */}
          <ResilientGarmentImage
            src={item.frontImage}
            alt={item.name}
            title={item.shortName}
            viewLabel={item.releaseNumber}
            className={`w-full h-full object-cover object-center transition-all duration-700 ${
              hovered && item.backImage && !reducedMotion
                ? 'opacity-0 scale-[1.03]'
                : 'opacity-100 group-hover:scale-[1.03]'
            }`}
          />

          {/* Subtle Back Artwork Preview on Hover */}
          {item.backImage && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 transition-all duration-700 ${
                hovered && !reducedMotion
                  ? 'opacity-100 scale-[1.02]'
                  : 'opacity-0 scale-100 pointer-events-none'
              }`}
            >
              <ResilientGarmentImage
                src={item.backImage}
                alt=""
                title={item.shortName}
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          {/* CSS Editorial Spotlight & Contrast Falloff */}
          <div
            aria-hidden="true"
            className="absolute inset-0 nyx-editorial-spotlight-ring"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 nyx-editorial-spotlight"
          />

          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0c0c10]/80 to-transparent pointer-events-none"
          />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4 border-t border-[#F3F2F0]/10">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-1.5">
            <span>{item.releaseNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{item.category}</span>
          </div>
          <h3 className="text-base font-semibold text-[#F3F2F0] leading-snug">
            {item.name}
          </h3>
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-[#F3F2F0]/[0.06]">
          <div className="flex items-baseline gap-2.5 font-mono-num">
            <span className="text-[15px] font-medium text-[#F3F2F0]">
              {formatInr(itemPricing.finalPrice)}
            </span>
            {itemPricing.hasDiscount && (
              <span className="text-xs text-[#A1A1AA] line-through">
                {formatInr(itemPricing.originalPrice)}
              </span>
            )}
          </div>
          <span className="text-xs tracking-[0.12em] uppercase text-[#8B7CA8]">
            {isSelected
              ? 'Inspecting'
              : itemPricing.hasDiscount
              ? `${item.discountPercent}% Off`
              : 'Inspect'}
          </span>
        </div>
      </div>
    </button>
  );
}

export function GarmentStageSection({
  products,
  selectedProductId,
  onSelectProduct,
  reducedMotion,
  bagCount,
  onReserveItem,
  onOpenBag,
}: GarmentStageSectionProps) {
  const activeProduct = products.find((p) => p.id === selectedProductId) ?? products[0];

  const [viewAngle, setViewAngle] = useState<GarmentViewAngle>('front');
  const [activeTab, setActiveTab] = useState<DetailTab>('artwork');
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('L');
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareAutoCopied, setShareAutoCopied] = useState(false);

  useEffect(() => {
    if (!activeProduct) return;
    if (!activeProduct.sizes[selectedSize]) {
      const firstAvailable = ALL_SIZES.find((s) => activeProduct.sizes[s]);
      if (firstAvailable) {
        setSelectedSize(firstAvailable);
      }
    }
    setQuantity(1);
    setViewAngle('front');
  }, [activeProduct?.id, activeProduct?.sizes]);

  if (!activeProduct) return null;

  const pricing = getEffectivePrice(activeProduct);
  const hasAnySizeAvailable = ALL_SIZES.some((s) => activeProduct.sizes[s]);
  const isSelectedSizeAvailable = Boolean(activeProduct.sizes[selectedSize]);

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?piece=${encodeURIComponent(
          activeProduct.id
        )}#garment-stage`
      : '';

  const shareMessage = [
    `NYKTERIA · ${activeProduct.releaseNumber}: ${activeProduct.name}`,
    `${formatInr(pricing.finalPrice)} — ${activeProduct.specs.weight}, ${activeProduct.specs.silhouette}.`,
    activeProduct.editorialNote,
  ].join('\n');

  const openShareModalWithCopy = async () => {
    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
        copied = true;
      } catch {
        copied = false;
      }
    }
    setShareAutoCopied(copied);
    setShareModalOpen(true);
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      await openShareModalWithCopy();
      return;
    }
    try {
      await navigator.share({
        title: `NYKTERIA — ${activeProduct.name}`,
        text: shareMessage,
        url: shareUrl,
      });
      triggerHaptic('select');
      setJustShared(true);
      window.setTimeout(() => setJustShared(false), 2200);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      await openShareModalWithCopy();
    }
  };

  const handleShareDrop = async () => {
    triggerHaptic('tap');
    if (typeof window !== 'undefined') {
      const nextUrl = `${window.location.pathname}?piece=${encodeURIComponent(
        activeProduct.id
      )}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
    }
    if (canNativeShare) {
      await handleNativeShare();
    } else {
      await openShareModalWithCopy();
    }
  };

  const handleReserveClick = () => {
    if (!isSelectedSizeAvailable) return;
    triggerHaptic('addToBag');
    onReserveItem(activeProduct, selectedSize, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <section
      id="release-stage"
      className="py-20 sm:py-28 bg-[#070709] border-b border-[#F3F2F0]/10"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <CinematicSectionReveal reducedMotion={reducedMotion}>
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#F3F2F0]/10">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#8B7CA8] mb-3">
                Active Release
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-[0.04em] text-[#F3F2F0] [text-wrap:balance]">
                Current Phased Pieces
              </h2>
            </div>
            <p className="text-sm text-[#A1A1AA] max-w-md leading-relaxed">
              Hover to preview rear engravings, or select a garment to examine every angle on the
              3D studio stage.
            </p>
          </div>

          {/* Active Collection 3D Tilt Cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => (
              <TiltProductCard
                key={item.id}
                item={item}
                isSelected={item.id === activeProduct.id}
                reducedMotion={reducedMotion}
                onSelect={() => {
                  triggerHaptic('select');
                  onSelectProduct(item.id);
                  const stageEl = document.getElementById('garment-stage');
                  if (stageEl) {
                    stageEl.scrollIntoView({
                      behavior: reducedMotion ? 'auto' : 'smooth',
                      block: 'start',
                    });
                  }
                }}
              />
            ))}
          </div>
        </CinematicSectionReveal>

        {/* Contiguous 3D Garment Stage & Purchase Module */}
        <div
          id="garment-stage"
          className="nyx-snap-section scroll-mt-16 mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-[#F3F2F0]/10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-start"
        >
          {/* Left Column: Interactive 3D Garment Stage */}
          <div className="lg:col-span-6 lg:sticky lg:top-24">
            <InteractiveGarment3D
              product={activeProduct}
              viewAngle={viewAngle}
              onChangeViewAngle={setViewAngle}
              reducedMotion={reducedMotion}
            />
          </div>

          {/* Right Column: Contiguous Product Detail & Reservation Module */}
          <motion.div
            key={activeProduct.id}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: LUXURY_EASE }}
            className="lg:col-span-6 flex flex-col"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs tracking-[0.14em] uppercase text-[#A1A1AA]">
                <span>{activeProduct.releaseNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{activeProduct.category}</span>
                {pricing.hasDiscount && activeProduct.promoLabel && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#A796C9] font-medium">{activeProduct.promoLabel}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleShareDrop}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#F3F2F0]/15 bg-[#101014] hover:border-[#8B7CA8] text-xs font-medium tracking-[0.12em] uppercase text-[#A1A1AA] hover:text-[#F3F2F0] transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
              >
                {justShared ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#A796C9]" />
                    <span className="text-[#F3F2F0]">Shared</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#A796C9]" />
                    <span>Share Drop</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.03em] text-[#F3F2F0] leading-tight [text-wrap:balance]">
              {activeProduct.name}
            </h3>

            {/* Pricing Row */}
            <div className="mt-5 pb-6 border-b border-[#F3F2F0]/10 flex flex-wrap items-baseline gap-4">
              <span className="font-mono-num text-2xl sm:text-3xl font-medium text-[#F3F2F0]">
                {formatInr(pricing.finalPrice)}
              </span>

              {pricing.hasDiscount && (
                <>
                  <span className="font-mono-num text-base text-[#A1A1AA] line-through">
                    {formatInr(pricing.originalPrice)}
                  </span>
                  <span className="text-xs font-medium tracking-[0.1em] uppercase text-[#A796C9]">
                    {activeProduct.discountPercent}% Offer Applied · Save {formatInr(pricing.savings)}
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 text-sm sm:text-[15px] leading-relaxed text-[#D4D4D8]">
              {activeProduct.editorialNote}
            </p>

            {/* Full Product Details Tabs with sliding Motion underline */}
            <div className="mt-8">
              <div
                role="tablist"
                aria-label="Garment specifications"
                className="flex items-center gap-6 border-b border-[#F3F2F0]/10"
              >
                {(
                  [
                    { id: 'artwork', label: 'Front & Back Art' },
                    { id: 'fabric', label: 'Fit & Fabric' },
                    { id: 'care', label: 'Garment Care' },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        triggerHaptic('tap');
                        setActiveTab(tab.id);
                      }}
                      className={`relative pb-3 text-xs font-medium tracking-[0.12em] uppercase transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                        isActive ? 'text-[#F3F2F0]' : 'text-[#A1A1AA] hover:text-[#F3F2F0]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="nyx-detail-tab-underline"
                          transition={{ duration: 0.3, ease: LUXURY_EASE }}
                          className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[#8B7CA8]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="py-5 min-h-[155px] text-sm text-[#D4D4D8]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: LUXURY_EASE }}
                  >
                    {activeTab === 'artwork' && (
                      <div className="space-y-4">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('flip');
                              setViewAngle('front');
                            }}
                            className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8B7CA8] hover:text-[#A796C9] mb-1 cursor-pointer"
                          >
                            Front Detailing (View Front)
                          </button>
                          <p className="text-[#A1A1AA] leading-relaxed">
                            {activeProduct.frontSummary}
                          </p>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('flip');
                              setViewAngle('back');
                            }}
                            className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8B7CA8] hover:text-[#A796C9] mb-1 cursor-pointer"
                          >
                            Back Artwork (Flip 3D)
                          </button>
                          <p className="text-[#A1A1AA] leading-relaxed">
                            {activeProduct.backSummary}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'fabric' && (
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border-b border-[#F3F2F0]/[0.06] pb-3">
                          <dt className="text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                            Weight
                          </dt>
                          <dd className="mt-1 text-sm text-[#F3F2F0] font-medium">
                            {activeProduct.specs.weight}
                          </dd>
                        </div>
                        <div className="border-b border-[#F3F2F0]/[0.06] pb-3">
                          <dt className="text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                            Silhouette
                          </dt>
                          <dd className="mt-1 text-sm text-[#F3F2F0] font-medium">
                            {activeProduct.specs.silhouette}
                          </dd>
                        </div>
                        <div className="border-b border-[#F3F2F0]/[0.06] pb-3 sm:col-span-2">
                          <dt className="text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                            Textile Composition
                          </dt>
                          <dd className="mt-1 text-sm text-[#F3F2F0]">
                            {activeProduct.specs.fabric}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                            Print Process
                          </dt>
                          <dd className="mt-1 text-sm text-[#F3F2F0]">
                            {activeProduct.specs.artworkMethod}
                          </dd>
                        </div>
                      </dl>
                    )}

                    {activeTab === 'care' && (
                      <ul className="space-y-2.5 text-[#A1A1AA]">
                        {activeProduct.specs.care.map((line, index) => (
                          <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                            <span className="font-mono-num text-xs text-[#8B7CA8] mt-0.5">
                              0{index + 1}.
                            </span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-4 pt-6 border-t border-[#F3F2F0]/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#F3F2F0]">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setSizeGuideOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#A796C9] hover:text-[#F3F2F0] underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Oversized & Drop-Shoulder Guide</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Garment size">
                {ALL_SIZES.map((size) => {
                  const available = Boolean(activeProduct.sizes[size]);
                  const active = selectedSize === size && available;
                  return (
                    <motion.button
                      key={size}
                      type="button"
                      disabled={!available}
                      whileTap={available && !reducedMotion ? { scale: 0.96 } : undefined}
                      onClick={() => {
                        triggerHaptic('select');
                        setSelectedSize(size);
                      }}
                      aria-checked={active}
                      role="radio"
                      className={`py-3 text-sm font-mono-num font-medium border transition-colors duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
                        !available
                          ? 'border-[#F3F2F0]/[0.06] bg-[#0c0c10] text-[#52525B] line-through cursor-not-allowed'
                          : active
                          ? 'border-[#F3F2F0] bg-[#F3F2F0] text-[#070709] cursor-pointer'
                          : 'border-[#F3F2F0]/15 bg-[#101014] text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer'
                      }`}
                    >
                      {size}
                    </motion.button>
                  );
                })}
              </div>
              {!hasAnySizeAvailable && (
                <p className="mt-2.5 text-xs text-amber-300/90">
                  All sizes currently held in archive allocation.
                </p>
              )}
            </div>

            {/* Quantity & Reservation Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex items-center justify-between border border-[#F3F2F0]/15 bg-[#101014] px-2 min-h-[48px] sm:w-36 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono-num text-sm font-medium text-[#F3F2F0]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setQuantity((q) => Math.min(5, q + 1));
                  }}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                type="button"
                disabled={!isSelectedSizeAvailable}
                whileTap={isSelectedSizeAvailable && !reducedMotion ? { scale: 0.985 } : undefined}
                onClick={handleReserveClick}
                className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] disabled:bg-[#27272A] disabled:text-[#71717A] text-xs font-semibold tracking-[0.14em] uppercase transition-colors duration-200 min-h-[48px] cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <span>
                    Add to Bag — {formatInr(pricing.finalPrice * quantity)}
                  </span>
                )}
              </motion.button>

              {bagCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onOpenBag();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 border border-[#8B7CA8]/50 bg-[#101014] text-[#F3F2F0] hover:border-[#A796C9] text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-200 min-h-[48px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#A796C9]" />
                  <span>Bag ({bagCount})</span>
                </button>
              )}
            </div>

            {/* Structured Trust Line */}
            <div className="mt-5 flex items-center gap-2.5 text-xs text-[#A1A1AA]">
              <ShieldCheck className="w-4 h-4 text-[#8B7CA8] shrink-0" />
              <span>
                Structured allocation summary · Full itemized breakdown & order ID issued before
                dispatch.
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        product={activeProduct}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        reducedMotion={reducedMotion}
      />

      <ShareDropModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        product={activeProduct}
        shareUrl={shareUrl}
        shareMessage={shareMessage}
        initialCopied={shareAutoCopied}
        canNativeShare={canNativeShare}
        onNativeShare={handleNativeShare}
        reducedMotion={reducedMotion}
      />
    </section>
  );
}

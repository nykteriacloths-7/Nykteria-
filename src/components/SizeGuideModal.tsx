import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Ruler, Check } from 'lucide-react';
import { GarmentSize, Product } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  selectedSize: GarmentSize;
  onSelectSize: (size: GarmentSize) => void;
  reducedMotion: boolean;
}

type GarmentSilhouette = 'hoodie' | 'tee';
type UnitMode = 'in' | 'cm';
type CalloutKey = 'shoulder' | 'chest' | 'length' | 'sleeve';

interface SizeSpecRow {
  size: GarmentSize;
  chestIn: number;
  shoulderIn: number;
  lengthIn: number;
  sleeveIn: number;
  fitNote: string;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

const SILHOUETTE_SPECS: Record<GarmentSilhouette, SizeSpecRow[]> = {
  hoodie: [
    {
      size: 'S',
      chestIn: 46,
      shoulderIn: 23.0,
      lengthIn: 26.5,
      sleeveIn: 22.0,
      fitNote: '5\'5"–5\'8" · Clean cropped boxy drape',
    },
    {
      size: 'M',
      chestIn: 48,
      shoulderIn: 24.0,
      lengthIn: 27.5,
      sleeveIn: 22.5,
      fitNote: '5\'8"–5\'11" · Balanced drop-shoulder',
    },
    {
      size: 'L',
      chestIn: 50,
      shoulderIn: 25.0,
      lengthIn: 28.5,
      sleeveIn: 23.0,
      fitNote: '5\'11"–6\'2" · Signature wide silhouette',
    },
    {
      size: 'XL',
      chestIn: 52,
      shoulderIn: 26.0,
      lengthIn: 29.5,
      sleeveIn: 23.5,
      fitNote: '6\'1"+ · Maximum heavyweight volume',
    },
  ],
  tee: [
    {
      size: 'S',
      chestIn: 44,
      shoulderIn: 21.5,
      lengthIn: 27.5,
      sleeveIn: 9.0,
      fitNote: '5\'5"–5\'8" · Relaxed upper chest',
    },
    {
      size: 'M',
      chestIn: 46,
      shoulderIn: 22.5,
      lengthIn: 28.5,
      sleeveIn: 9.5,
      fitNote: '5\'8"–5\'11" · Elbow-skimming sleeve',
    },
    {
      size: 'L',
      chestIn: 48,
      shoulderIn: 23.5,
      lengthIn: 29.5,
      sleeveIn: 10.0,
      fitNote: '5\'11"–6\'2" · Architectural boxy fall',
    },
    {
      size: 'XL',
      chestIn: 50,
      shoulderIn: 24.5,
      lengthIn: 30.5,
      sleeveIn: 10.5,
      fitNote: '6\'1"+ · Full oversized street proportion',
    },
  ],
};

const CALLOUT_DETAILS: Record<
  CalloutKey,
  { code: string; label: string; description: string }
> = {
  shoulder: {
    code: 'A',
    label: 'Drop-Shoulder Seam',
    description:
      'Cut 2.5–3.5 in wider than a classic shoulder seam so the seam sits naturally off the deltoid, creating an effortless architectural slope.',
  },
  chest: {
    code: 'B',
    label: 'Boxy Chest Volume',
    description:
      'Measured across the full chest circumference (2× pit-to-pit). Provides generous room through the torso without ballooning at the waist.',
  },
  length: {
    code: 'C',
    label: 'Balanced Body Length',
    description:
      'Measured from high-point shoulder to hem. Slightly cropped relative to chest width so the garment frames cleanly at the hip.',
  },
  sleeve: {
    code: 'D',
    label: 'Calibrated Sleeve Span',
    description:
      'Shortened from the dropped shoulder seam so cuffs sit cleanly at the wrist (hoodie) or mid-bicep/elbow (tee) without excess stacking.',
  },
};

function formatMeasure(inches: number, unit: UnitMode): string {
  if (unit === 'in') {
    return `${inches.toFixed(inches % 1 === 0 ? 0 : 1)} in`;
  }
  return `${Math.round(inches * 2.54)} cm`;
}

export function SizeGuideModal({
  open,
  onClose,
  product,
  selectedSize,
  onSelectSize,
  reducedMotion,
}: SizeGuideModalProps) {
  const defaultSilhouette: GarmentSilhouette = product.category.toLowerCase().includes('tee')
    ? 'tee'
    : 'hoodie';

  const [silhouette, setSilhouette] = useState<GarmentSilhouette>(defaultSilhouette);
  const [unit, setUnit] = useState<UnitMode>('in');
  const [activeCallout, setActiveCallout] = useState<CalloutKey>('shoulder');

  useEffect(() => {
    setSilhouette(
      product.category.toLowerCase().includes('tee') ? 'tee' : 'hoodie'
    );
  }, [product.id, product.category]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const rows = SILHOUETTE_SPECS[silhouette];
  const activeRow = rows.find((r) => r.size === selectedSize) ?? rows[1];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="size-guide-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.24 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Oversized Fit & Drop-Shoulder Size Guide"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            key="size-guide-dialog"
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 22, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12, scale: 0.98 }
            }
            transition={{ duration: reducedMotion ? 0.1 : 0.36, ease: LUXURY_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl border border-[#F3F2F0]/15 bg-[#0b0b0f] text-[#F3F2F0] shadow-[0_32px_90px_rgba(0,0,0,0.9)] overflow-hidden my-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#F3F2F0]/10 bg-[#101014]">
              <div>
                <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Oversized Fit Architecture</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-semibold tracking-[0.04em] text-[#F3F2F0] mt-1">
                  Drop-Shoulder & Dimension Guide
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="w-10 h-10 flex items-center justify-center border border-[#F3F2F0]/15 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Controls Row */}
            <div className="px-6 py-4 border-b border-[#F3F2F0]/10 flex flex-wrap items-center justify-between gap-4 bg-[#09090d]">
              {/* Silhouette Switch */}
              <div className="inline-flex border border-[#F3F2F0]/15 bg-[#070709] p-1">
                {(
                  [
                    { id: 'hoodie', label: '480 GSM Hoodie' },
                    { id: 'tee', label: '280 GSM Tee' },
                  ] as const
                ).map((item) => {
                  const active = silhouette === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setSilhouette(item.id);
                      }}
                      className={`relative px-3.5 py-1.5 text-xs font-medium tracking-[0.08em] uppercase whitespace-nowrap cursor-pointer ${
                        active ? 'text-[#070709]' : 'text-[#A1A1AA] hover:text-[#F3F2F0]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nyx-sizeguide-silhouette"
                          transition={{ duration: 0.25, ease: LUXURY_EASE }}
                          className="absolute inset-0 bg-[#F3F2F0]"
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Unit Toggle */}
              <div className="inline-flex border border-[#F3F2F0]/15 bg-[#070709] p-1">
                {(['in', 'cm'] as const).map((u) => {
                  const active = unit === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setUnit(u);
                      }}
                      className={`relative px-3.5 py-1.5 text-xs font-mono-num uppercase cursor-pointer ${
                        active ? 'text-[#070709]' : 'text-[#A1A1AA] hover:text-[#F3F2F0]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nyx-sizeguide-unit"
                          transition={{ duration: 0.22, ease: LUXURY_EASE }}
                          className="absolute inset-0 bg-[#8B7CA8]"
                        />
                      )}
                      <span className="relative z-10">{u}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Interactive Architectural Drop-Shoulder Diagram */}
              <div className="lg:col-span-5 border border-[#F3F2F0]/10 bg-[#101014] p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-3">
                  <span className="uppercase tracking-[0.12em]">Pattern Blueprint</span>
                  <span className="font-mono-num text-[#A796C9]">
                    Size {activeRow.size}
                  </span>
                </div>

                {/* Architectural Garment SVG with Interactive Measurement Callouts */}
                <svg
                  viewBox="0 0 260 240"
                  className="w-full h-52 select-none"
                  fill="none"
                >
                  {/* Garment Silhouette Outline */}
                  {silhouette === 'hoodie' ? (
                    <path
                      d="M95 36 Q130 50 165 36 L194 48 L236 86 L216 116 L196 102 L196 206 L64 206 L64 102 L44 116 L24 86 L66 48 Z"
                      fill="#0b0b0f"
                      stroke="rgba(243,242,240,0.28)"
                      strokeWidth="1.5"
                    />
                  ) : (
                    <path
                      d="M98 38 Q130 54 162 38 L194 48 L232 82 L212 108 L196 96 L196 206 L64 206 L64 96 L48 108 L28 82 L66 48 Z"
                      fill="#0b0b0f"
                      stroke="rgba(243,242,240,0.28)"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Drop-shoulder seam markers */}
                  <line
                    x1="64"
                    y1="56"
                    x2="64"
                    y2="100"
                    stroke="rgba(243,242,240,0.22)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="196"
                    y1="56"
                    x2="196"
                    y2="100"
                    stroke="rgba(243,242,240,0.22)"
                    strokeDasharray="3 3"
                  />

                  {/* A: Drop-Shoulder Width Line */}
                  <g
                    onClick={() => setActiveCallout('shoulder')}
                    className="cursor-pointer"
                  >
                    <line
                      x1="64"
                      y1="52"
                      x2="196"
                      y2="52"
                      stroke={activeCallout === 'shoulder' ? '#A796C9' : 'rgba(243,242,240,0.4)'}
                      strokeWidth={activeCallout === 'shoulder' ? '2.2' : '1.2'}
                    />
                    <circle
                      cx="130"
                      cy="52"
                      r="10"
                      fill={activeCallout === 'shoulder' ? '#8B7CA8' : '#18181f'}
                      stroke="#A796C9"
                    />
                    <text
                      x="130"
                      y="55.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={activeCallout === 'shoulder' ? '#070709' : '#F3F2F0'}
                    >
                      A
                    </text>
                  </g>

                  {/* B: Boxy Chest Width Line */}
                  <g
                    onClick={() => setActiveCallout('chest')}
                    className="cursor-pointer"
                  >
                    <line
                      x1="66"
                      y1="118"
                      x2="194"
                      y2="118"
                      stroke={activeCallout === 'chest' ? '#A796C9' : 'rgba(243,242,240,0.4)'}
                      strokeWidth={activeCallout === 'chest' ? '2.2' : '1.2'}
                    />
                    <circle
                      cx="130"
                      cy="118"
                      r="10"
                      fill={activeCallout === 'chest' ? '#8B7CA8' : '#18181f'}
                      stroke="#A796C9"
                    />
                    <text
                      x="130"
                      y="121.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={activeCallout === 'chest' ? '#070709' : '#F3F2F0'}
                    >
                      B
                    </text>
                  </g>

                  {/* C: Body Length Line */}
                  <g
                    onClick={() => setActiveCallout('length')}
                    className="cursor-pointer"
                  >
                    <line
                      x1="164"
                      y1="38"
                      x2="164"
                      y2="205"
                      stroke={activeCallout === 'length' ? '#A796C9' : 'rgba(243,242,240,0.4)'}
                      strokeWidth={activeCallout === 'length' ? '2.2' : '1.2'}
                    />
                    <circle
                      cx="164"
                      cy="168"
                      r="10"
                      fill={activeCallout === 'length' ? '#8B7CA8' : '#18181f'}
                      stroke="#A796C9"
                    />
                    <text
                      x="164"
                      y="171.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={activeCallout === 'length' ? '#070709' : '#F3F2F0'}
                    >
                      C
                    </text>
                  </g>

                  {/* D: Sleeve Span */}
                  <g
                    onClick={() => setActiveCallout('sleeve')}
                    className="cursor-pointer"
                  >
                    <line
                      x1="64"
                      y1="56"
                      x2="30"
                      y2="90"
                      stroke={activeCallout === 'sleeve' ? '#A796C9' : 'rgba(243,242,240,0.4)'}
                      strokeWidth={activeCallout === 'sleeve' ? '2.2' : '1.2'}
                    />
                    <circle
                      cx="44"
                      cy="74"
                      r="10"
                      fill={activeCallout === 'sleeve' ? '#8B7CA8' : '#18181f'}
                      stroke="#A796C9"
                    />
                    <text
                      x="44"
                      y="77.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={activeCallout === 'sleeve' ? '#070709' : '#F3F2F0'}
                    >
                      D
                    </text>
                  </g>
                </svg>

                {/* Interactive Callout Selector Buttons */}
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {(['shoulder', 'chest', 'length', 'sleeve'] as const).map((key) => {
                    const info = CALLOUT_DETAILS[key];
                    const active = activeCallout === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setActiveCallout(key);
                        }}
                        className={`py-1.5 text-[11px] font-mono-num border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#8B7CA8] text-[#070709] border-[#8B7CA8] font-semibold'
                            : 'bg-[#070709] text-[#A1A1AA] border-[#F3F2F0]/10 hover:text-[#F3F2F0]'
                        }`}
                      >
                        {info.code} · {key}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Callout Explanation */}
                <div className="mt-4 pt-4 border-t border-[#F3F2F0]/10">
                  <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[#A796C9]">
                    {CALLOUT_DETAILS[activeCallout].code}.{' '}
                    {CALLOUT_DETAILS[activeCallout].label}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                    {CALLOUT_DETAILS[activeCallout].description}
                  </p>
                </div>
              </div>

              {/* Right: Size Matrix & Fit Guidance */}
              <div className="lg:col-span-7 space-y-5">
                <div className="overflow-x-auto border border-[#F3F2F0]/10 bg-[#101014]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F3F2F0]/10 text-[11px] uppercase tracking-[0.12em] text-[#A1A1AA]">
                        <th className="py-3 px-4 font-medium">Size</th>
                        <th className="py-3 px-3 font-medium">A · Shoulder</th>
                        <th className="py-3 px-3 font-medium">B · Chest</th>
                        <th className="py-3 px-3 font-medium">C · Length</th>
                        <th className="py-3 px-4 font-medium">D · Sleeve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F2F0]/[0.06] text-xs sm:text-sm font-mono-num">
                      {rows.map((row) => {
                        const isRowSelected = row.size === selectedSize;
                        const isAvailable = Boolean(product.sizes[row.size]);
                        return (
                          <tr
                            key={row.size}
                            onClick={() => {
                              if (isAvailable) {
                                triggerHaptic('select');
                                onSelectSize(row.size);
                              }
                            }}
                            className={`transition-colors ${
                              isAvailable ? 'cursor-pointer' : 'opacity-45 cursor-not-allowed'
                            } ${
                              isRowSelected
                                ? 'bg-[#8B7CA8]/15 text-[#F3F2F0]'
                                : 'text-[#D4D4D8] hover:bg-[#F3F2F0]/[0.03]'
                            }`}
                          >
                            <td className="py-3.5 px-4 font-semibold">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={isRowSelected ? 'text-[#A796C9]' : ''}>
                                  {row.size}
                                </span>
                                {isRowSelected && <Check className="w-3.5 h-3.5 text-[#A796C9]" />}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              {formatMeasure(row.shoulderIn, unit)}
                            </td>
                            <td className="py-3.5 px-3">
                              {formatMeasure(row.chestIn, unit)}
                            </td>
                            <td className="py-3.5 px-3">
                              {formatMeasure(row.lengthIn, unit)}
                            </td>
                            <td className="py-3.5 px-4">
                              {formatMeasure(row.sleeveIn, unit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Size Fit Note */}
                <div className="border border-[#F3F2F0]/10 bg-[#101014] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#8B7CA8]">
                      Selected Size {activeRow.size} Fit Profile
                    </p>
                    <p className="mt-1 text-sm text-[#F3F2F0]">{activeRow.fitNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-[#F3F2F0] text-[#070709] text-xs font-semibold tracking-[0.12em] uppercase whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Apply Size {selectedSize}
                  </button>
                </div>

                {/* Drop-Shoulder & Oversized Buying Guidance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-[#A1A1AA]">
                  <div className="border border-[#F3F2F0]/10 bg-[#101014]/60 p-4">
                    <p className="font-semibold text-[#F3F2F0] uppercase tracking-[0.1em] mb-1.5">
                      True to Your Size
                    </p>
                    <p>
                      Select your normal streetwear size for NYKTERIA&apos;s intended boxy chest
                      volume and dropped shoulder line.
                    </p>
                  </div>
                  <div className="border border-[#F3F2F0]/10 bg-[#101014]/60 p-4">
                    <p className="font-semibold text-[#F3F2F0] uppercase tracking-[0.1em] mb-1.5">
                      Closer Standard Fit
                    </p>
                    <p>
                      Size down one step if you prefer the shoulder seam closer to your collarbone
                      with less chest drape.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

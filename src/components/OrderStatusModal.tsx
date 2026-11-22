import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Search, PackageCheck, Check } from 'lucide-react';
import { OrderReservation, OrderStatus } from '../types';
import { formatInr } from '../utils/pricing';
import { triggerHaptic } from '../utils/haptics';
import { ResilientGarmentImage } from './ResilientGarmentImage';

interface OrderStatusModalProps {
  open: boolean;
  onClose: () => void;
  orders: OrderReservation[];
  initialOrderId?: string;
  reducedMotion: boolean;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

const PROCESSING_STAGES: { status: OrderStatus; step: string; detail: string }[] = [
  {
    status: 'Confirmed Reservation',
    step: '01',
    detail: 'Reservation logged and allocated from active batch stock.',
  },
  {
    status: 'Preparing Allocation',
    step: '02',
    detail: 'Garment pulled from archive vault, tagged, and steamed.',
  },
  {
    status: 'Quality Inspection',
    step: '03',
    detail: 'Print cure, stitch seam tension, and sizing double-checked.',
  },
  {
    status: 'Dispatched',
    step: '04',
    detail: 'Sealed in obsidian garment packaging and handed to courier.',
  },
];

function normalizeOrderQuery(raw: string): string {
  return raw.trim().replace(/^#/, '').toUpperCase();
}

export function OrderStatusModal({
  open,
  onClose,
  orders,
  initialOrderId = '',
  reducedMotion,
}: OrderStatusModalProps) {
  const [query, setQuery] = useState(initialOrderId);
  const [submittedQuery, setSubmittedQuery] = useState(initialOrderId);

  useEffect(() => {
    if (open && initialOrderId) {
      setQuery(initialOrderId);
      setSubmittedQuery(initialOrderId);
    }
  }, [open, initialOrderId]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const matchedOrder = useMemo(() => {
    const clean = normalizeOrderQuery(submittedQuery);
    if (!clean) return null;
    return (
      orders.find((o) => {
        const oid = o.orderId.toUpperCase();
        return oid === clean || oid === `NYK-${clean}`;
      }) ?? null
    );
  }, [orders, submittedQuery]);

  const activeStageIndex = matchedOrder
    ? Math.max(
        0,
        PROCESSING_STAGES.findIndex((s) => s.status === matchedOrder.status)
      )
    : -1;

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      triggerHaptic('error');
      return;
    }
    setSubmittedQuery(query.trim());
    const clean = normalizeOrderQuery(query);
    const found = orders.some(
      (o) => o.orderId.toUpperCase() === clean || o.orderId.toUpperCase() === `NYK-${clean}`
    );
    triggerHaptic(found ? 'select' : 'error');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="order-status-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.24 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Reservation Order Status Lookup"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/82 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            key="order-status-dialog"
            initial={
              reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.36, ease: LUXURY_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl border border-[#F3F2F0]/15 bg-[#0b0b0f] text-[#F3F2F0] shadow-[0_32px_90px_rgba(0,0,0,0.92)] overflow-hidden my-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-[#F3F2F0]/10 bg-[#101014]">
              <div>
                <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Allocation Tracker</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-semibold tracking-[0.04em] text-[#F3F2F0] mt-1">
                  Order Status Lookup
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onClose();
                }}
                aria-label="Close order status lookup"
                className="w-10 h-10 flex items-center justify-center border border-[#F3F2F0]/15 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Reservation ID Search Form */}
              <form onSubmit={handleLookupSubmit} className="space-y-3">
                <label
                  htmlFor="order-lookup-input"
                  className="block text-xs tracking-[0.12em] uppercase text-[#A1A1AA]"
                >
                  Enter Reservation ID
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="order-lookup-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. NYK-4821"
                      autoComplete="off"
                      className="w-full bg-[#101014] border border-[#F3F2F0]/15 pl-10 pr-4 py-3 text-sm font-mono-num uppercase text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8] min-h-[44px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase transition-colors whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
                  >
                    Check Status
                  </button>
                </div>

                {/* Quick shortcuts for reservations placed in current browser */}
                {orders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-[#A1A1AA]">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[#71717A]">
                      Recent in browser:
                    </span>
                    {orders.slice(0, 4).map((o) => (
                      <button
                        key={o.orderId}
                        type="button"
                        onClick={() => {
                          triggerHaptic('select');
                          setQuery(o.orderId);
                          setSubmittedQuery(o.orderId);
                        }}
                        className="font-mono-num text-xs text-[#A796C9] hover:text-[#F3F2F0] underline underline-offset-4 cursor-pointer"
                      >
                        #{o.orderId}
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {/* Lookup Result State */}
              {submittedQuery.trim() !== '' && !matchedOrder && (
                <div className="border border-[#F3F2F0]/10 bg-[#101014] p-6 text-center space-y-2">
                  <p className="font-display text-base text-[#F3F2F0]">
                    Reservation Not Found
                  </p>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                    No active allocation matching{' '}
                    <span className="font-mono-num text-[#F3F2F0]">
                      #{normalizeOrderQuery(submittedQuery)}
                    </span>{' '}
                    was found in this session. Verify your NYK-XXXX confirmation code.
                  </p>
                </div>
              )}

              {matchedOrder && (
                <div className="space-y-5">
                  {/* Real-Time Status Summary Header */}
                  <div className="border border-[#8B7CA8]/45 bg-[#101014] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-num text-[#A796C9] uppercase tracking-[0.14em]">
                        <span>Order #{matchedOrder.orderId}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(matchedOrder.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-display text-lg font-medium text-[#F3F2F0]">
                        {matchedOrder.status}
                      </h3>
                      <p className="mt-1 text-xs text-[#A1A1AA]">
                        {matchedOrder.customerName} · {matchedOrder.city}
                        {matchedOrder.postalCode && matchedOrder.postalCode !== '—'
                          ? ` (${matchedOrder.postalCode})`
                          : ''}
                      </p>
                    </div>
                    <div className="sm:text-right font-mono-num">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#71717A] block">
                        Allocation Value
                      </span>
                      <span className="text-lg font-semibold text-[#F3F2F0]">
                        {formatInr(matchedOrder.totalInr)}
                      </span>
                    </div>
                  </div>

                  {/* Minimalist 4-Stage Processing Timeline */}
                  <div className="border border-[#F3F2F0]/10 bg-[#101014]/70 p-5">
                    <p className="text-[11px] tracking-[0.16em] uppercase text-[#8B7CA8] mb-4">
                      Garment Processing Stage
                    </p>
                    <ol className="space-y-4">
                      {PROCESSING_STAGES.map((stage, idx) => {
                        const completed = idx <= activeStageIndex;
                        const isCurrent = idx === activeStageIndex;
                        return (
                          <li key={stage.status} className="flex items-start gap-3.5">
                            <div
                              aria-hidden="true"
                              className={`mt-0.5 w-6 h-6 shrink-0 border flex items-center justify-center font-mono-num text-[11px] ${
                                isCurrent
                                  ? 'border-[#A796C9] bg-[#8B7CA8] text-[#070709] font-semibold'
                                  : completed
                                  ? 'border-[#8B7CA8]/60 bg-[#101014] text-[#A796C9]'
                                  : 'border-[#F3F2F0]/12 bg-[#070709] text-[#52525B]'
                              }`}
                            >
                              {completed && !isCurrent ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                stage.step
                              )}
                            </div>

                            <div className="flex-1 min-w-0 border-b border-[#F3F2F0]/[0.06] pb-3 last:border-b-0 last:pb-0">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    isCurrent
                                      ? 'text-[#F3F2F0]'
                                      : completed
                                      ? 'text-[#D4D4D8]'
                                      : 'text-[#71717A]'
                                  }`}
                                >
                                  {stage.status}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] font-mono-num uppercase tracking-[0.14em] text-[#A796C9]">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p
                                className={`mt-0.5 text-xs leading-relaxed ${
                                  completed ? 'text-[#A1A1AA]' : 'text-[#52525B]'
                                }`}
                              >
                                {stage.detail}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Reserved Garments List */}
                  <div className="border border-[#F3F2F0]/10 bg-[#101014] divide-y divide-[#F3F2F0]/[0.06]">
                    {matchedOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.size}`}
                        className="p-4 flex items-center gap-3.5"
                      >
                        <div className="w-11 aspect-[3/4] shrink-0 bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden">
                          <ResilientGarmentImage
                            src={item.thumbnail}
                            alt={item.productName}
                            title={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#F3F2F0] truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs font-mono-num text-[#A1A1AA] mt-0.5">
                            Size {item.size} · Qty {item.quantity}
                          </p>
                        </div>
                        <span className="font-mono-num text-xs sm:text-sm text-[#F3F2F0]">
                          {formatInr(item.finalUnitPriceInr * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!submittedQuery.trim() && orders.length === 0 && (
                <p className="text-xs text-[#A1A1AA] leading-relaxed border-t border-[#F3F2F0]/10 pt-4">
                  Your unique NYK-XXXX reservation code is issued immediately upon confirming an
                  order request in the reservation bag.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

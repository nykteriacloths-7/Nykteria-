import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, ArrowRight } from 'lucide-react';
import { GarmentSize } from '../types';
import { formatInr } from '../utils/pricing';
import { ResilientGarmentImage } from './ResilientGarmentImage';

export interface ToastPayload {
  id: number;
  productName: string;
  shortName: string;
  size: GarmentSize;
  quantity: number;
  unitPriceInr: number;
  thumbnail: string;
}

interface ReservationToastProps {
  toast: ToastPayload | null;
  reducedMotion: boolean;
  onDismiss: () => void;
  onOpenBag: () => void;
}

export function ReservationToast({
  toast,
  reducedMotion,
  onDismiss,
  onOpenBag,
}: ReservationToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 4400);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 right-4 sm:bottom-7 sm:right-7 z-50 pointer-events-none max-w-[calc(100vw-2rem)] w-full sm:w-[380px]"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 18, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.98 }
            }
            transition={{
              duration: reducedMotion ? 0.12 : 0.42,
              ease: [0.19, 1, 0.22, 1],
            }}
            className="pointer-events-auto relative overflow-hidden border border-[#F3F2F0]/15 bg-[#0c0c10]/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
          >
            {/* Subtle top hairline accent */}
            <div
              aria-hidden="true"
              className="h-[1px] w-full bg-gradient-to-r from-[#8B7CA8]/70 via-[#F3F2F0]/25 to-transparent"
            />

            <div className="p-4 flex items-center gap-3.5">
              {/* Thumbnail */}
              <div className="w-12 aspect-[3/4] shrink-0 bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden">
                <ResilientGarmentImage
                  src={toast.thumbnail}
                  alt={toast.productName}
                  title={toast.shortName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Copy */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-[#A796C9]">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>Added to Bag</span>
                </div>
                <p className="mt-1 text-sm font-medium text-[#F3F2F0] truncate">
                  {toast.shortName}
                </p>
                <p className="mt-0.5 font-mono-num text-xs text-[#A1A1AA]">
                  Size {toast.size} · Qty {toast.quantity} ·{' '}
                  {formatInr(toast.unitPriceInr * toast.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onDismiss();
                    onOpenBag();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-[#F3F2F0] hover:text-[#A796C9] transition-colors cursor-pointer focus-visible:outline-none"
                >
                  <span>Review Reservation</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss notification"
                className="self-start p-1.5 text-[#A1A1AA] hover:text-[#F3F2F0] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-dismiss hairline progress bar */}
            {!reducedMotion && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4.4, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
                className="h-[2px] w-full bg-[#8B7CA8]/65"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

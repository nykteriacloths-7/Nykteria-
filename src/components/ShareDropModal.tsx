import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Link2, Share2, X } from 'lucide-react';
import { Product } from '../types';
import { formatInr, getEffectivePrice } from '../utils/pricing';
import { triggerHaptic } from '../utils/haptics';
import { ResilientGarmentImage } from './ResilientGarmentImage';

interface ShareDropModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  shareUrl: string;
  shareMessage: string;
  initialCopied?: boolean;
  canNativeShare: boolean;
  onNativeShare: () => void;
  reducedMotion: boolean;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

export function ShareDropModal({
  open,
  onClose,
  product,
  shareUrl,
  shareMessage,
  initialCopied = false,
  canNativeShare,
  onNativeShare,
  reducedMotion,
}: ShareDropModalProps) {
  const [copiedField, setCopiedField] = useState<'link' | 'message' | null>(
    initialCopied ? 'message' : null
  );

  useEffect(() => {
    if (open) {
      setCopiedField(initialCopied ? 'message' : null);
    }
  }, [open, initialCopied]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const copyText = async (value: string, field: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(value);
      triggerHaptic('select');
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2200);
    } catch {
      triggerHaptic('error');
    }
  };

  const pricing = getEffectivePrice(product);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-drop-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.22 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${product.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/82 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            key="share-drop-dialog"
            initial={
              reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.34, ease: LUXURY_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg border border-[#F3F2F0]/15 bg-[#0b0b0f] text-[#F3F2F0] shadow-[0_32px_90px_rgba(0,0,0,0.92)] overflow-hidden my-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-[#F3F2F0]/10 bg-[#101014]">
              <div>
                <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Drop Dispatch</span>
                </div>
                <h2 className="font-display text-lg font-semibold tracking-[0.04em] text-[#F3F2F0] mt-1">
                  Share Release Piece
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onClose();
                }}
                aria-label="Close share drop dialog"
                className="w-10 h-10 flex items-center justify-center border border-[#F3F2F0]/15 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Piece Summary Strip */}
              <div className="flex items-center gap-4 border border-[#F3F2F0]/10 bg-[#101014] p-3.5">
                <div className="w-12 aspect-[3/4] shrink-0 bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden">
                  <ResilientGarmentImage
                    src={product.frontImage}
                    alt={product.name}
                    title={product.shortName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] tracking-[0.14em] uppercase text-[#8B7CA8]">
                    {product.releaseNumber} · {product.category}
                  </p>
                  <p className="text-sm font-semibold text-[#F3F2F0] truncate mt-0.5">
                    {product.name}
                  </p>
                  <p className="font-mono-num text-xs text-[#A1A1AA] mt-0.5">
                    {formatInr(pricing.finalPrice)} · {product.specs.weight}
                  </p>
                </div>
              </div>

              {/* Direct Drop Link */}
              <div className="space-y-2">
                <label
                  htmlFor="nyx-share-link"
                  className="block text-xs tracking-[0.12em] uppercase text-[#A1A1AA]"
                >
                  Direct Stage Link
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1 min-w-0">
                    <Link2 className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="nyx-share-link"
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full bg-[#101014] border border-[#F3F2F0]/15 pl-9 pr-3 py-2.5 text-xs font-mono-num text-[#D4D4D8] focus:outline-none focus:border-[#8B7CA8] min-h-[44px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(shareUrl, 'link')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#F3F2F0]/15 bg-[#101014] hover:border-[#8B7CA8] text-xs font-medium tracking-[0.12em] uppercase text-[#F3F2F0] transition-colors whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
                  >
                    {copiedField === 'link' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#A796C9]" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#A796C9]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Branded NYKTERIA Message */}
              <div className="space-y-2">
                <span className="block text-xs tracking-[0.12em] uppercase text-[#A1A1AA]">
                  NYKTERIA Branded Dispatch Note
                </span>
                <div className="border border-[#F3F2F0]/10 bg-[#101014] p-4 text-xs sm:text-[13px] leading-relaxed text-[#D4D4D8] whitespace-pre-line">
                  {shareMessage}
                </div>
              </div>

              {/* Action Row */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => copyText(`${shareMessage}\n${shareUrl}`, 'message')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase transition-colors whitespace-nowrap min-h-[44px] cursor-pointer"
                >
                  {copiedField === 'message' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Drop Invite Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Branded Invite</span>
                    </>
                  )}
                </button>

                {canNativeShare && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      onNativeShare();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-[#8B7CA8]/50 bg-[#101014] hover:border-[#A796C9] text-xs font-medium tracking-[0.12em] uppercase text-[#F3F2F0] transition-colors whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#A796C9]" />
                    <span>Share Sheet</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Trash2, Plus, Minus, CheckCircle2, ArrowRight } from 'lucide-react';
import { CartReservationItem, OrderReservation } from '../types';
import { formatInr } from '../utils/pricing';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

interface ReservationDrawerProps {
  open: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  items: CartReservationItem[];
  onUpdateQuantity: (productId: string, size: CartReservationItem['size'], delta: number) => void;
  onRemoveItem: (productId: string, size: CartReservationItem['size']) => void;
  onClearBag: () => void;
  onSubmitReservation: (order: OrderReservation) => void;
  onTrackOrder?: (orderId: string) => void;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

export function ReservationDrawer({
  open,
  reducedMotion,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearBag,
  onSubmitReservation,
  onTrackOrder,
}: ReservationDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderReservation | null>(null);

  const subtotalOriginal = items.reduce(
    (sum, item) => sum + item.unitPriceInr * item.quantity,
    0
  );
  const totalFinal = items.reduce(
    (sum, item) => sum + item.finalUnitPriceInr * item.quantity,
    0
  );
  const totalSavings = Math.max(0, subtotalOriginal - totalFinal);

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!customerName.trim() || !contact.trim() || !city.trim() || !address.trim()) {
      triggerHaptic('error');
      setFormError('Please enter your name, contact detail, city, and delivery address.');
      return;
    }

    setFormError('');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newOrder: OrderReservation = {
      orderId: `NYK-${randomCode}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      contact: contact.trim(),
      city: city.trim(),
      postalCode: postalCode.trim() || '—',
      address: address.trim(),
      notes: notes.trim(),
      items: [...items],
      totalInr: totalFinal,
      status: 'Confirmed Reservation',
    };

    triggerHaptic('confirmOrder');
    onSubmitReservation(newOrder);
    setConfirmedOrder(newOrder);
    onClearBag();
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    setFormError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reservation-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.28 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Order Reservation Summary"
        >
          <motion.div
            key="reservation-panel"
            initial={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: reducedMotion ? 0.1 : 0.42, ease: LUXURY_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-[#0b0b0f] border-l border-[#F3F2F0]/15 h-full flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F2F0]/10 bg-[#101014]">
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
                  Structured Allocation
                </p>
                <h2 className="font-display text-lg font-semibold tracking-[0.06em] text-[#F3F2F0] mt-0.5">
                  {confirmedOrder ? 'Reservation Confirmed' : 'Order Request Summary'}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close reservation drawer"
                className="w-10 h-10 flex items-center justify-center border border-[#F3F2F0]/15 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {confirmedOrder ? (
                <div className="space-y-6">
                  <div className="border border-[#8B7CA8]/50 bg-[#101014] p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#A796C9] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-mono-num text-xs uppercase tracking-[0.14em] text-[#A796C9]">
                          Order #{confirmedOrder.orderId} · {confirmedOrder.status}
                        </p>
                        <h3 className="mt-1.5 text-lg font-semibold text-[#F3F2F0]">
                          Allocation recorded for {confirmedOrder.customerName}
                        </h3>
                        <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">
                          Your structured garment request is logged. Confirmation and dispatch
                          verification will be sent to {confirmedOrder.contact}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#F3F2F0]/10 bg-[#101014] p-5 space-y-4">
                    <h4 className="text-xs tracking-[0.14em] uppercase text-[#A1A1AA]">
                      Itemized Receipt
                    </h4>
                    <div className="divide-y divide-[#F3F2F0]/10">
                      {confirmedOrder.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.size}`}
                          className="py-3 flex items-center justify-between gap-4 text-sm"
                        >
                          <div>
                            <p className="font-medium text-[#F3F2F0]">{item.productName}</p>
                            <p className="text-xs text-[#A1A1AA] font-mono-num mt-0.5">
                              Size {item.size} · Qty {item.quantity}
                            </p>
                          </div>
                          <span className="font-mono-num text-[#F3F2F0]">
                            {formatInr(item.finalUnitPriceInr * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-[#F3F2F0]/10 flex items-center justify-between font-mono-num">
                      <span className="text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                        Total Payable
                      </span>
                      <span className="text-lg font-semibold text-[#F3F2F0]">
                        {formatInr(confirmedOrder.totalInr)}
                      </span>
                    </div>
                  </div>

                  <div className="border border-[#F3F2F0]/10 bg-[#101014] p-5 text-sm text-[#A1A1AA] space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#F3F2F0] mb-2">
                      Delivery Destination
                    </p>
                    <p>{confirmedOrder.address}</p>
                    <p>
                      {confirmedOrder.city} — {confirmedOrder.postalCode}
                    </p>
                    {confirmedOrder.notes && (
                      <p className="pt-2 text-xs text-[#A1A1AA]">Note: {confirmedOrder.notes}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {onTrackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          const orderId = confirmedOrder.orderId;
                          triggerHaptic('tap');
                          handleClose();
                          onTrackOrder(orderId);
                        }}
                        className="w-full py-3.5 border border-[#8B7CA8]/60 bg-[#101014] text-[#F3F2F0] hover:border-[#A796C9] text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer"
                      >
                        Track Order Status (#{confirmedOrder.orderId})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-3.5 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer"
                    >
                      Return to Storefront
                    </button>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <p className="font-display text-lg text-[#F3F2F0]">No Garments Queued</p>
                  <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
                    Select a size on the 3D Garment Stage and click Add to Bag to build your
                    itemized allocation request.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 px-5 py-3 border border-[#F3F2F0]/20 text-xs uppercase tracking-[0.12em] text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer"
                  >
                    <span>Browse Active Pieces</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Itemized List */}
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.size}`}
                        className="flex gap-4 border border-[#F3F2F0]/10 bg-[#101014] p-4"
                      >
                        <div className="w-20 aspect-[3/4] shrink-0 bg-[#070709] overflow-hidden border border-[#F3F2F0]/10">
                          <ResilientGarmentImage
                            src={item.thumbnail}
                            alt={item.productName}
                            title={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-[#F3F2F0] leading-snug">
                                {item.productName}
                              </h3>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('tap');
                                  onRemoveItem(item.productId, item.size);
                                }}
                                aria-label={`Remove ${item.productName}`}
                                className="text-[#A1A1AA] hover:text-red-400 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs font-mono-num text-[#A1A1AA]">
                              Size {item.size} · Unit {formatInr(item.finalUnitPriceInr)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center border border-[#F3F2F0]/15 bg-[#070709]">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('tap');
                                  onUpdateQuantity(item.productId, item.size, -1);
                                }}
                                aria-label="Decrease quantity"
                                className="w-8 h-8 flex items-center justify-center text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono-num text-xs text-[#F3F2F0]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('tap');
                                  onUpdateQuantity(item.productId, item.size, 1);
                                }}
                                aria-label="Increase quantity"
                                className="w-8 h-8 flex items-center justify-center text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span className="font-mono-num text-sm font-medium text-[#F3F2F0]">
                              {formatInr(item.finalUnitPriceInr * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="border border-[#F3F2F0]/10 bg-[#101014] p-5 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between text-[#A1A1AA]">
                      <span>Retail Subtotal</span>
                      <span className="font-mono-num">{formatInr(subtotalOriginal)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <div className="flex items-center justify-between text-[#A796C9]">
                        <span>Active Release Offer</span>
                        <span className="font-mono-num">−{formatInr(totalSavings)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[#A1A1AA]">
                      <span>Insured Dispatch (India)</span>
                      <span className="font-mono-num text-[#F3F2F0]">Complimentary</span>
                    </div>
                    <div className="pt-3 border-t border-[#F3F2F0]/10 flex items-center justify-between font-semibold text-[#F3F2F0]">
                      <span>Final Total</span>
                      <span className="font-mono-num text-lg">{formatInr(totalFinal)}</span>
                    </div>
                  </div>

                  {/* Verification Form */}
                  <form id="reservation-form" onSubmit={handleConfirmOrder} className="space-y-4">
                    <p className="text-xs tracking-[0.16em] uppercase text-[#8B7CA8]">
                      Buyer Verification Details
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="res-name"
                          className="block text-xs text-[#A1A1AA] mb-1.5"
                        >
                          Full Name *
                        </label>
                        <input
                          id="res-name"
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Aarav Mehta"
                          className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="res-contact"
                          className="block text-xs text-[#A1A1AA] mb-1.5"
                        >
                          Phone or Email *
                        </label>
                        <input
                          id="res-contact"
                          type="text"
                          required
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="+91 98XXX XXXXX"
                          className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="res-city"
                          className="block text-xs text-[#A1A1AA] mb-1.5"
                        >
                          City *
                        </label>
                        <input
                          id="res-city"
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="res-pin"
                          className="block text-xs text-[#A1A1AA] mb-1.5"
                        >
                          Postal Code
                        </label>
                        <input
                          id="res-pin"
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="400001"
                          className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="res-address"
                        className="block text-xs text-[#A1A1AA] mb-1.5"
                      >
                        Street Address *
                      </label>
                      <input
                        id="res-address"
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Apartment, street, landmark"
                        className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="res-notes"
                        className="block text-xs text-[#A1A1AA] mb-1.5"
                      >
                        Allocation / Fit Notes (Optional)
                      </label>
                      <input
                        id="res-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Preferred delivery window or payment preference (UPI / COD)"
                        className="w-full bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8]"
                      />
                    </div>

                    {formError && <p className="text-xs text-red-400">{formError}</p>}

                    <button
                      type="submit"
                      className="w-full py-4 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer min-h-[48px]"
                    >
                      Confirm Reservation — {formatInr(totalFinal)}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Trash2, Plus, Minus, CheckCircle2, ArrowRight, FlaskConical, MailCheck } from 'lucide-react';
import { CartReservationItem, GarmentSize, OrderReservation, Product } from '../types';
import { formatInr, getEffectivePrice } from '../utils/pricing';
import { sendOrderEmailViaFormSubmit, STORE_OWNER_EMAIL } from '../utils/orderEmail';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

interface ReservationDrawerProps {
  open: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  items: CartReservationItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, size: CartReservationItem['size'], delta: number) => void;
  onChangeItemSize: (
    productId: string,
    currentSize: GarmentSize,
    nextSize: GarmentSize
  ) => void;
  onRemoveItem: (productId: string, size: CartReservationItem['size']) => void;
  onClearBag: () => void;
  onSubmitReservation: (order: OrderReservation) => void;
  onUpdateOrderEmailStatus: (orderId: string, delivered: boolean) => void;
  onTrackOrder?: (orderId: string) => void;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;
const ALL_SIZES: GarmentSize[] = ['S', 'M', 'L', 'XL'];

export function ReservationDrawer({
  open,
  reducedMotion,
  onClose,
  items,
  products,
  onUpdateQuantity,
  onChangeItemSize,
  onRemoveItem,
  onClearBag,
  onSubmitReservation,
  onUpdateOrderEmailStatus,
  onTrackOrder,
}: ReservationDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderReservation | null>(null);
  const [emailStatusNote, setEmailStatusNote] = useState('');

  const subtotalOriginal = items.reduce(
    (sum, item) => sum + item.unitPriceInr * item.quantity,
    0
  );
  const totalFinal = items.reduce(
    (sum, item) => sum + item.finalUnitPriceInr * item.quantity,
    0
  );
  const totalSavings = Math.max(0, subtotalOriginal - totalFinal);

  const finalizeAndSendOrder = async (order: OrderReservation, clearCurrentBag: boolean) => {
    setIsSubmitting(true);
    setFormError('');

    // Persist locally immediately so Admin & Order Status always record the order
    onSubmitReservation(order);
    triggerHaptic('confirmOrder');
    setConfirmedOrder(order);
    if (clearCurrentBag) {
      onClearBag();
    }

    const emailResult = await sendOrderEmailViaFormSubmit(order);
    onUpdateOrderEmailStatus(order.orderId, emailResult.delivered);
    setConfirmedOrder((prev) =>
      prev && prev.orderId === order.orderId
        ? { ...prev, emailDelivered: emailResult.delivered }
        : prev
    );
    setEmailStatusNote(emailResult.message);
    setIsSubmitting(false);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    if (!customerName.trim() || !contact.trim() || !addressLine1.trim() || !city.trim()) {
      triggerHaptic('error');
      setFormError(
        'Please enter your full name, phone/contact, Address Line 1, and city.'
      );
      return;
    }

    const line1 = addressLine1.trim();
    const line2 = addressLine2.trim();
    const formattedAddress = line2 ? `${line1}, ${line2}` : line1;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newOrder: OrderReservation = {
      orderId: `NYK-${randomCode}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      contact: contact.trim(),
      addressLine1: line1,
      addressLine2: line2,
      city: city.trim(),
      postalCode: postalCode.trim() || '—',
      address: formattedAddress,
      notes: notes.trim(),
      items: [...items],
      totalInr: totalFinal,
      status: 'Confirmed Reservation',
    };

    await finalizeAndSendOrder(newOrder, true);
  };

  const handleSendTestOrder = async () => {
    if (isSubmitting) return;
    const fallbackProduct = products[0];
    if (!fallbackProduct && items.length === 0) return;

    const orderItems: CartReservationItem[] =
      items.length > 0
        ? [...items]
        : [
            (() => {
              const pricing = getEffectivePrice(fallbackProduct);
              return {
                productId: fallbackProduct.id,
                productName: fallbackProduct.name,
                category: fallbackProduct.category,
                size: 'L',
                quantity: 1,
                unitPriceInr: pricing.originalPrice,
                discountPercent: pricing.hasDiscount ? fallbackProduct.discountPercent : 0,
                finalUnitPriceInr: pricing.finalPrice,
                thumbnail: fallbackProduct.frontImage,
              };
            })(),
          ];

    const line1 = addressLine1.trim() || 'Studio Allocation Bay 04, Kala Ghoda';
    const line2 = addressLine2.trim() || 'Fort Heritage Wing, Ground Floor';
    const randomCode = Math.floor(1000 + Math.random() * 9000);

    const testOrder: OrderReservation = {
      orderId: `NYK-${randomCode}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Test Order — NYKTERIA Verification',
      contact: contact.trim() || `+91 98200 00000 / ${STORE_OWNER_EMAIL}`,
      addressLine1: line1,
      addressLine2: line2,
      city: city.trim() || 'Mumbai',
      postalCode: postalCode.trim() || '400001',
      address: line2 ? `${line1}, ${line2}` : line1,
      notes: notes.trim() || 'Live email test order dispatched to store owner.',
      items: orderItems,
      totalInr: orderItems.reduce((sum, i) => sum + i.finalUnitPriceInr * i.quantity, 0),
      status: 'Confirmed Reservation',
      isTestOrder: true,
    };

    await finalizeAndSendOrder(testOrder, false);
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    setEmailStatusNote('');
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
            className="relative w-full max-w-xl bg-[#0e0e14] border-l border-[#F3F2F0]/15 h-full flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F2F0]/10 bg-[#15151d]">
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
                  Structured Allocation
                </p>
                <h2 className="font-display text-lg font-semibold tracking-[0.06em] text-[#F3F2F0] mt-0.5">
                  {confirmedOrder
                    ? confirmedOrder.isTestOrder
                      ? 'Test Order Logged'
                      : 'Reservation Confirmed'
                    : 'Order Request Summary'}
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
                  <div className="border border-[#8B7CA8]/50 bg-[#15151d] p-6">
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
                          Your structured garment request is saved. Confirmation and dispatch
                          verification target: {confirmedOrder.contact}.
                        </p>

                        <div className="mt-3 pt-3 border-t border-[#F3F2F0]/10 flex items-center gap-2 text-xs text-[#D4D4D8]">
                          <MailCheck className="w-4 h-4 text-[#A796C9] shrink-0" />
                          <span>
                            {emailStatusNote ||
                              `Sending order dispatch email to ${STORE_OWNER_EMAIL}...`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#F3F2F0]/10 bg-[#15151d] p-5 space-y-4">
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

                  <div className="border border-[#F3F2F0]/10 bg-[#15151d] p-5 text-sm text-[#A1A1AA] space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#F3F2F0] mb-2">
                      Delivery Destination
                    </p>
                    <p className="text-[#D4D4D8]">
                      {confirmedOrder.addressLine1 || confirmedOrder.address}
                    </p>
                    {confirmedOrder.addressLine2 && (
                      <p className="text-[#D4D4D8]">{confirmedOrder.addressLine2}</p>
                    )}
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
                        className="w-full py-3.5 border border-[#8B7CA8]/60 bg-[#15151d] text-[#F3F2F0] hover:border-[#A796C9] text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer"
                      >
                        Track Order Status (#{confirmedOrder.orderId})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-3.5 bg-[#F3F2F0] text-[#0b0b10] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer"
                    >
                      Return to Storefront
                    </button>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center space-y-5">
                  <p className="font-display text-lg text-[#F3F2F0]">No Garments Queued</p>
                  <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
                    Select a size on the 3D Garment Stage and click Add to Bag, or send a live test
                    order directly to verify email notifications.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#F3F2F0] text-[#0b0b10] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#E4E2DE] cursor-pointer min-h-[44px]"
                    >
                      <span>Browse Active Pieces</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSendTestOrder}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-[#8B7CA8]/50 bg-[#15151d] text-xs uppercase tracking-[0.12em] text-[#F3F2F0] hover:border-[#A796C9] cursor-pointer min-h-[44px]"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-[#A796C9]" />
                      <span>{isSubmitting ? 'Sending...' : 'Send Test Order'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Itemized List with Quick Size Adjustment */}
                  <div className="space-y-4">
                    {items.map((item) => {
                      const productRecord = products.find((p) => p.id === item.productId);
                      return (
                        <div
                          key={`${item.productId}-${item.size}`}
                          className="flex gap-4 border border-[#F3F2F0]/10 bg-[#15151d] p-4"
                        >
                          <div className="w-20 aspect-[3/4] shrink-0 bg-[#0f0f15] overflow-hidden border border-[#F3F2F0]/10">
                            <ResilientGarmentImage
                              src={item.thumbnail}
                              alt={item.productName}
                              title={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
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
                                Unit {formatInr(item.finalUnitPriceInr)}
                              </p>

                              {/* Quick Size Selector inside Bag */}
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="text-[11px] uppercase tracking-[0.1em] text-[#A1A1AA] mr-1">
                                  Size:
                                </span>
                                {ALL_SIZES.map((sz) => {
                                  const available = productRecord ? productRecord.sizes[sz] : true;
                                  const active = item.size === sz;
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      disabled={!available}
                                      onClick={() => {
                                        if (sz === item.size) return;
                                        triggerHaptic('select');
                                        onChangeItemSize(item.productId, item.size, sz);
                                      }}
                                      className={`px-2 py-0.5 text-[11px] font-mono-num border transition-colors ${
                                        !available
                                          ? 'border-[#F3F2F0]/[0.05] text-[#52525B] line-through cursor-not-allowed'
                                          : active
                                          ? 'border-[#F3F2F0] bg-[#F3F2F0] text-[#0b0b10] font-semibold'
                                          : 'border-[#F3F2F0]/15 bg-[#0f0f15] text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer'
                                      }`}
                                    >
                                      {sz}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="inline-flex items-center border border-[#F3F2F0]/15 bg-[#0f0f15]">
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
                      );
                    })}
                  </div>

                  {/* Price Breakdown */}
                  <div className="border border-[#F3F2F0]/10 bg-[#15151d] p-5 space-y-2.5 text-sm">
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
                      Buyer Verification & Delivery Details
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
                          className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
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
                          className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="res-address-1"
                        className="block text-xs text-[#A1A1AA] mb-1.5"
                      >
                        Address Line 1 *
                      </label>
                      <input
                        id="res-address-1"
                        type="text"
                        required
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="House / Building No., Street Name"
                        className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="res-address-2"
                        className="block text-xs text-[#A1A1AA] mb-1.5"
                      >
                        Address Line 2 (Optional)
                      </label>
                      <input
                        id="res-address-2"
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        placeholder="Apartment, Floor, Landmark"
                        className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                      />
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
                          className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
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
                          className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>
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
                        className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                      />
                    </div>

                    {formError && <p className="text-xs text-red-400">{formError}</p>}

                    <div className="space-y-2.5 pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#F3F2F0] text-[#0b0b10] hover:bg-[#E4E2DE] disabled:opacity-60 text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer min-h-[48px]"
                      >
                        {isSubmitting
                          ? 'Dispatching Reservation...'
                          : `Confirm Reservation — ${formatInr(totalFinal)}`}
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSendTestOrder}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 border border-[#8B7CA8]/45 bg-[#15151d] hover:border-[#A796C9] disabled:opacity-60 text-xs font-medium tracking-[0.12em] uppercase text-[#D4D4D8] hover:text-[#F3F2F0] transition-colors cursor-pointer min-h-[44px]"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-[#A796C9]" />
                        <span>Send Test Order to {STORE_OWNER_EMAIL}</span>
                      </button>
                    </div>
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


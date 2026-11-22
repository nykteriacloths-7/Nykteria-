import { Product } from '../types';

export function formatInr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function getEffectivePrice(product: Pick<Product, 'priceInr' | 'discountEnabled' | 'discountPercent'>): {
  originalPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  savings: number;
} {
  const originalPrice = Math.max(0, Math.round(product.priceInr));
  const clampedDiscount = Math.min(85, Math.max(0, Math.round(product.discountPercent)));
  const hasDiscount = Boolean(product.discountEnabled && clampedDiscount > 0);
  const finalPrice = hasDiscount
    ? Math.max(1, Math.round(originalPrice * (1 - clampedDiscount / 100)))
    : originalPrice;

  return {
    originalPrice,
    finalPrice,
    hasDiscount,
    savings: Math.max(0, originalPrice - finalPrice),
  };
}

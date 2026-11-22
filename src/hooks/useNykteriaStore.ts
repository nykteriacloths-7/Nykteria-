import { useState, useEffect, useCallback } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { OrderReservation, OrderStatus, Product } from '../types';
import { getEffectivePrice } from '../utils/pricing';

const PRODUCTS_STORAGE_KEY = 'nykteria_products_v1';
const ORDERS_STORAGE_KEY = 'nykteria_orders_v1';
const TEST_ORDER_SEEDED_KEY = 'nykteria_test_order_seeded_v1';
const REDUCED_MOTION_KEY = 'nykteria_reduced_motion_v1';

function buildInitialTestOrder(): OrderReservation {
  const leadPiece = INITIAL_PRODUCTS[0];
  const pricing = getEffectivePrice(leadPiece);
  return {
    orderId: 'NYK-1024',
    createdAt: new Date().toISOString(),
    customerName: 'Test Order — Aarav Mehta',
    contact: 'nykteriacloths@gmail.com',
    city: 'Mumbai',
    postalCode: '400001',
    address: 'Suite 4B, Kala Ghoda Atelier Lane, Fort',
    notes: 'Sample test allocation for verifying stage progression & tracking.',
    items: [
      {
        productId: leadPiece.id,
        productName: leadPiece.name,
        category: leadPiece.category,
        size: 'L',
        quantity: 1,
        unitPriceInr: pricing.originalPrice,
        discountPercent: pricing.hasDiscount ? leadPiece.discountPercent : 0,
        finalUnitPriceInr: pricing.finalPrice,
        thumbnail: leadPiece.frontImage,
      },
    ],
    totalInr: pricing.finalPrice,
    status: 'Preparing Allocation',
  };
}

function readStoredProducts(): Product[] {
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return INITIAL_PRODUCTS;
    const parsed = JSON.parse(raw) as Product[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

function readStoredOrders(): OrderReservation[] {
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as OrderReservation[]) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const alreadySeeded = window.localStorage.getItem(TEST_ORDER_SEEDED_KEY) === 'true';

    if (list.length === 0 && !alreadySeeded) {
      const seedOrder = buildInitialTestOrder();
      window.localStorage.setItem(TEST_ORDER_SEEDED_KEY, 'true');
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([seedOrder]));
      return [seedOrder];
    }
    return list;
  } catch {
    return [];
  }
}

function readReducedMotionPreference(): boolean {
  try {
    const raw = window.localStorage.getItem(REDUCED_MOTION_KEY);
    if (raw !== null) {
      return raw === 'true';
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  } catch {
    return false;
  }
}

export function useNykteriaStore() {
  const [products, setProducts] = useState<Product[]>(() => readStoredProducts());
  const [orders, setOrders] = useState<OrderReservation[]>(() => readStoredOrders());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => readReducedMotionPreference());

  useEffect(() => {
    try {
      window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [orders]);

  // Real-time synchronization across browser tabs/windows for products and order status
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === ORDERS_STORAGE_KEY) {
        setOrders(readStoredOrders());
      } else if (e.key === PRODUCTS_STORAGE_KEY) {
        setProducts(readStoredProducts());
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(REDUCED_MOTION_KEY, String(reducedMotion));
    } catch {
      // Ignore storage errors
    }
    if (reducedMotion) {
      document.documentElement.classList.add('nyx-reduced-motion');
    } else {
      document.documentElement.classList.remove('nyx-reduced-motion');
    }
  }, [reducedMotion]);

  const updateProduct = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, ...updates } : item))
    );
  }, []);

  const addProduct = useCallback((newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== productId);
    });
  }, []);

  const resetProductsToDefault = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    try {
      window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addOrderReservation = useCallback((order: OrderReservation) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const createTestOrder = useCallback((): OrderReservation => {
    const targetProduct = products[0] ?? INITIAL_PRODUCTS[0];
    const pricing = getEffectivePrice(targetProduct);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const testOrder: OrderReservation = {
      orderId: `NYK-${randomCode}`,
      createdAt: new Date().toISOString(),
      customerName: 'Test Order — Verification Sample',
      contact: 'nykteriacloths@gmail.com',
      city: 'Mumbai',
      postalCode: '400001',
      address: 'Studio Allocation Bay 04, Fort',
      notes: 'Generated live test order for verification.',
      items: [
        {
          productId: targetProduct.id,
          productName: targetProduct.name,
          category: targetProduct.category,
          size: 'L',
          quantity: 1,
          unitPriceInr: pricing.originalPrice,
          discountPercent: pricing.hasDiscount ? targetProduct.discountPercent : 0,
          finalUnitPriceInr: pricing.finalPrice,
          thumbnail: targetProduct.frontImage,
        },
      ],
      totalInr: pricing.finalPrice,
      status: 'Confirmed Reservation',
    };
    setOrders((prev) => [testOrder, ...prev]);
    return testOrder;
  }, [products]);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.orderId === orderId ? { ...order, status } : order))
    );
  }, []);

  return {
    products,
    orders,
    reducedMotion,
    setReducedMotion,
    updateProduct,
    addProduct,
    removeProduct,
    resetProductsToDefault,
    addOrderReservation,
    createTestOrder,
    updateOrderStatus,
  };
}

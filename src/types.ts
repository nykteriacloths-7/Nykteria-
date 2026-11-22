export type GarmentSize = 'S' | 'M' | 'L' | 'XL';

export type GarmentViewAngle = 'front' | 'back' | 'angle';

export interface ProductSpecs {
  weight: string;
  silhouette: string;
  fabric: string;
  artworkMethod: string;
  care: string[];
}

export interface Product {
  id: string;
  releaseNumber: string;
  name: string;
  shortName: string;
  category: string;
  priceInr: number;
  discountEnabled: boolean;
  discountPercent: number;
  promoLabel: string;
  frontSummary: string;
  backSummary: string;
  editorialNote: string;
  frontImage: string;
  backImage: string;
  sizes: Record<GarmentSize, boolean>;
  specs: ProductSpecs;
  createdAt: string;
}

export interface CartReservationItem {
  productId: string;
  productName: string;
  category: string;
  size: GarmentSize;
  quantity: number;
  unitPriceInr: number;
  discountPercent: number;
  finalUnitPriceInr: number;
  thumbnail: string;
}

export type OrderStatus =
  | 'Confirmed Reservation'
  | 'Preparing Allocation'
  | 'Quality Inspection'
  | 'Dispatched';

export interface OrderReservation {
  orderId: string;
  createdAt: string;
  customerName: string;
  contact: string;
  city: string;
  postalCode: string;
  address: string;
  notes: string;
  items: CartReservationItem[];
  totalInr: number;
  status: OrderStatus;
}

export interface UpcomingReleaseSlot {
  id: string;
  pieceNumber: string;
  title: string;
  category: string;
  targetNote: string;
}

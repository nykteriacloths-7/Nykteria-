import { OrderReservation } from '../types';
import { formatInr } from './pricing';

export const STORE_OWNER_EMAIL = 'nykteriacloths@gmail.com';
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${STORE_OWNER_EMAIL}`;

export interface EmailDispatchResult {
  delivered: boolean;
  message: string;
}

export async function sendOrderEmailViaFormSubmit(
  order: OrderReservation
): Promise<EmailDispatchResult> {
  const productList = order.items
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(' | ');
  const sizeList = order.items
    .map((item) => `Size ${item.size} (${item.productName})`)
    .join(' | ');

  const subjectPrefix = order.isTestOrder ? '[TEST ORDER] ' : '';
  const payload = {
    _subject: `${subjectPrefix}NYKTERIA Order #${order.orderId} — ${productList}`,
    _captcha: 'false',
    _template: 'table',
    orderId: order.orderId,
    orderType: order.isTestOrder ? 'TEST ORDER' : 'RESERVATION ORDER',
    product: productList,
    size: sizeList,
    totalPrice: formatInr(order.totalInr),
    customerName: order.customerName,
    customerContact: order.contact,
    addressLine1: order.addressLine1 || order.address,
    addressLine2: order.addressLine2 || '—',
    city: order.city,
    postalCode: order.postalCode || '—',
    notes: order.notes || '—',
    submittedAt: order.createdAt,
  };

  try {
    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        delivered: false,
        message: `Order saved locally. Email endpoint returned HTTP ${response.status}.`,
      };
    }

    const result = (await response.json().catch(() => ({}))) as {
      success?: string | boolean;
      message?: string;
    };

    if (result.success === false || result.success === 'false') {
      return {
        delivered: false,
        message:
          result.message ||
          `Order saved locally. Verify ${STORE_OWNER_EMAIL} activation in FormSubmit if pending.`,
      };
    }

    return {
      delivered: true,
      message: `Order email sent to ${STORE_OWNER_EMAIL}.`,
    };
  } catch {
    return {
      delivered: false,
      message: `Order saved locally (email request offline or blocked by network).`,
    };
  }
}

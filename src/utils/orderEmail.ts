import { OrderReservation } from '../types';
import { formatInr } from './pricing';

export const STORE_OWNER_EMAIL = 'nykteriacloths@gmail.com';
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${STORE_OWNER_EMAIL}`;

export interface EmailDispatchResult {
  delivered: boolean;
  needsActivation?: boolean;
  message: string;
  errorDetail?: string;
}

export function buildOrderSummaryText(order: OrderReservation): string {
  const itemLines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName} — Size ${item.size} × ${item.quantity} (${formatInr(
          item.finalUnitPriceInr * item.quantity
        )})`
    )
    .join('\n');

  const lines = [
    `${order.isTestOrder ? '[TEST ORDER] ' : ''}NYKTERIA ORDER #${order.orderId}`,
    `Status: ${order.status}`,
    `Submitted: ${order.createdAt}`,
    '',
    'GARMENTS:',
    itemLines,
    `Total Payable: ${formatInr(order.totalInr)}`,
    '',
    'CUSTOMER & DELIVERY:',
    `Name: ${order.customerName}`,
    `Contact: ${order.contact}`,
    `Address Line 1: ${order.addressLine1 || order.address}`,
    `Address Line 2: ${order.addressLine2 || '—'}`,
    `City: ${order.city}`,
    `Postal Code: ${order.postalCode || '—'}`,
    `Notes: ${order.notes || '—'}`,
  ];

  return lines.join('\n');
}

export function buildOrderMailtoHref(order: OrderReservation): string {
  const productList = order.items
    .map((item) => `${item.productName} (${item.size} × ${item.quantity})`)
    .join(', ');
  const subjectPrefix = order.isTestOrder ? '[TEST ORDER] ' : '';
  const subject = `${subjectPrefix}NYKTERIA Order #${order.orderId} — ${productList}`;
  const body = buildOrderSummaryText(order);

  return `mailto:${STORE_OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

    const rawText = await response.text().catch(() => '');
    let parsed: { success?: string | boolean; message?: string } = {};
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as { success?: string | boolean; message?: string };
      } catch {
        // Non-JSON response body
      }
    }

    if (!response.ok) {
      const detail =
        parsed.message ||
        (rawText ? rawText.slice(0, 180) : `HTTP ${response.status} ${response.statusText}`);
      return {
        delivered: false,
        message: `Email delivery failed (HTTP ${response.status}).`,
        errorDetail: `FormSubmit returned HTTP ${response.status}: ${detail}`,
      };
    }

    const msgLower = (parsed.message || '').toLowerCase();
    const needsActivation = msgLower.includes('activat');

    if (parsed.success === false || parsed.success === 'false' || needsActivation) {
      const detail =
        parsed.message ||
        `FormSubmit requires one-time activation: check ${STORE_OWNER_EMAIL} (including Spam / All Mail) and click the "Activate Form" link.`;
      return {
        delivered: false,
        needsActivation,
        message: `FormSubmit requires activation or rejected delivery.`,
        errorDetail: detail,
      };
    }

    return {
      delivered: true,
      message: `Order sent to ${STORE_OWNER_EMAIL}.`,
    };
  } catch (err) {
    const reason =
      err instanceof Error && err.message
        ? err.message
        : 'Network/CORS blocked the request to formsubmit.co.';
    return {
      delivered: false,
      message: `Unable to reach FormSubmit email service.`,
      errorDetail: `${reason} (Order was saved locally in Owner Admin.)`,
    };
  }
}

/**
 * Единый формат заявки владельцу для ОБОИХ источников: Telegram-бот и сайт.
 * Вынесено из scenario.ts без изменения выходного текста (тесты-сценария
 * сверяют его байт-в-байт). Никакого Telegram-транспорта здесь нет —
 * только чистое форматирование.
 */

import { formatPrice, type CartLine, type DeliveryMethod } from "@/lib/cart";

/** Адрес точки самовывоза — тот же, что в секции «Доставка» сайта. */
export const PICKUP_ADDRESS = "Москва, Лесная ул., 5";

export function productEmoji(productId: string): string {
  return productId === "cheese-chicken" ? "🧀" : "🌯";
}

export function cartLinesText(lines: CartLine[]): string {
  return lines
    .map(
      (l) =>
        `${productEmoji(l.product.id)} ${l.product.name} × ${l.quantity} — ${formatPrice(l.lineTotal)}`,
    )
    .join("\n");
}

export type AdminOrderMessage = {
  orderNumber: number;
  lines: CartLine[];
  subtotal: number;
  deliveryCost: number;
  method: DeliveryMethod;
  customerName: string;
  /** Уже отформатированный к показу телефон. */
  phone: string;
  /** Для доставки — адрес; для самовывоза игнорируется. */
  address: string;
  /** Подпись способа оплаты: «картой» | «наличными» | «при получении». */
  paymentLabel: string;
  /** «Telegram» | «Сайт» — обязательное различие источника заказа. */
  source: string;
};

export function formatAdminOrder(order: AdminOrderMessage): string {
  const total = order.subtotal + order.deliveryCost;
  const deliveryLine =
    order.method === "pickup"
      ? "🏠 Самовывоз — 0 ₽"
      : `🚚 Доставка — ${formatPrice(order.deliveryCost)}`;
  const addressLine =
    order.method === "pickup"
      ? `📍 Получение: самовывоз (${PICKUP_ADDRESS})`
      : `📍 Адрес: ${order.address}`;
  return (
    `🔔 НОВЫЙ ЗАКАЗ #${order.orderNumber}\n\n` +
    `${cartLinesText(order.lines)}\n\n` +
    `${deliveryLine}\n` +
    `💰 ИТОГО: ${formatPrice(total)}\n\n` +
    `👤 Клиент: ${order.customerName}\n` +
    `📞 Телефон: ${order.phone}\n` +
    `${addressLine}\n` +
    `💳 Оплата: ${order.paymentLabel}\n` +
    `📲 Источник: ${order.source}`
  );
}

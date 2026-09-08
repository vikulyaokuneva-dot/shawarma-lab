import type { CartLine, DeliveryMethod } from "@/lib/cart";

/**
 * Сервис отправки заказа.
 *
 * Архитектурный слой, полностью отделённый от UI: компоненты не знают,
 * как именно заказ уходит «на кухню». Сейчас — mock-реализация:
 *   1) сохраняет заказ в localStorage;
 *   2) выводит его в console;
 *   3) возвращает Promise с подтверждением для success-экрана.
 *
 * TODO:
 *   Connect Telegram Bot API / backend endpoint.
 *   Следующий этап: заменить тело submitOrder() на реальный запрос, например
 *
 *     const response = await fetch("/api/orders", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(order),
 *     });
 *
 *   или напрямую отправлять заказ в Telegram-бота через backend / n8n-webhook.
 *   Формат PlacedOrder ниже — это будущий контракт API, менять его не нужно.
 */

export type OrderCustomer = {
  name: string;
  phone: string;
  address?: string;
  apartment?: string;
  comment?: string;
};

export type OrderItemSnapshot = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type PlacedOrder = {
  number: string;
  createdAt: string;
  method: DeliveryMethod;
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  customer: OrderCustomer;
};

export type SubmitOrderInput = {
  lines: CartLine[];
  customer: OrderCustomer;
  method: DeliveryMethod;
  subtotal: number;
  deliveryCost: number;
};

const ORDERS_STORAGE_KEY = "shawarma-lab:orders:v1";

function generateOrderNumber(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `SL-${suffix}`;
}

function saveOrderHistory(order: PlacedOrder): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const history: PlacedOrder[] = raw ? JSON.parse(raw) : [];
    history.unshift(order);
    window.localStorage.setItem(
      ORDERS_STORAGE_KEY,
      JSON.stringify(history.slice(0, 20)),
    );
  } catch {
    // Хранилище недоступно — не блокируем подтверждение заказа.
  }
}

export async function submitOrder(input: SubmitOrderInput): Promise<PlacedOrder> {
  const order: PlacedOrder = {
    number: generateOrderNumber(),
    createdAt: new Date().toISOString(),
    method: input.method,
    subtotal: input.subtotal,
    deliveryCost: input.deliveryCost,
    total: input.subtotal + input.deliveryCost,
    customer: input.customer,
    items: input.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      price: line.product.price,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
  };

  // Имитация сетевой задержки, чтобы кнопка «Подтвердить» выглядела правдоподобно.
  await new Promise((resolve) => setTimeout(resolve, 700));

  saveOrderHistory(order);

  console.info("[Shawarma Lab] Новый заказ:", order);

  // TODO: Connect Telegram Bot API / backend endpoint.

  return order;
}

import type { CartLine, DeliveryMethod } from "@/lib/cart";

/**
 * Сервис отправки заказа.
 *
 * Поток: checkout на сайте → POST /api/orders (app/api/orders/route.ts) →
 * серверная валидация и пересчёт цен (lib/server/order.ts) → заявка владельцу
 * через существующий Telegram-клиент (lib/telegram/client.ts) → успех на сайте.
 *
 * Токен бота и chat_id владельца живут только в server-side окружении —
 * сюда они не попадают. Наружу идут только безопасные русские фразы без
 * internals и stack trace. Заказ считается успешным ИСКЛЮЧИТЕЛЬНО когда
 * сервер подтвердил доставку заявки в Telegram; иначе submitOrder бросает
 * Error, а Checkout показывает её у кнопки отправки (корзина сохраняется).
 *
 * Формат PlacedOrder ниже — контракт API, менять его не нужно.
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

/** История заказов на демо — по-прежнему в localStorage клиента. */
const ORDERS_STORAGE_KEY = "shawarma-lab:orders:v1";

const GENERIC_ERROR =
  "Не удалось отправить заказ. Попробуйте ещё раз через минуту.";

/** Machine-readable коды ответов /api/orders → фразы для человека. */
const SERVER_ERROR_MESSAGES: Record<string, string> = {
  validation:
    "Состав заказа или данные устарели — обновите страницу и попробуйте снова.",
  "not-configured": "Приём заказов временно недоступен. Попробуйте позже.",
  "telegram-unavailable":
    "Сервер приёма заказов не ответил — заявка НЕ отправлена. Попробуйте ещё раз через минуту.",
  internal:
    "На сервере произошла ошибка. Заказ НЕ отправлен. Попробуйте ещё раз.",
};

type OrderApiResponse = {
  ok?: boolean;
  error?: string;
  number?: string;
  createdAt?: string;
  subtotal?: number;
  deliveryCost?: number;
  total?: number;
};

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

/**
 * Отправляет заказ на сервер. Возвращает PlacedOrder только когда сервер
 * подтвердил доставку заявки владельцу в Telegram; в противном случае
 * бросает Error с безопасным для показа текстом.
 */
export async function submitOrder(
  input: SubmitOrderInput,
): Promise<PlacedOrder> {
  let response: Response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: input.lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
        method: input.method,
        customer: {
          name: input.customer.name,
          phone: input.customer.phone,
          address: input.customer.address,
          apartment: input.customer.apartment,
          comment: input.customer.comment,
        },
      }),
    });
  } catch {
    // Сеть/эндпоинт недоступны — заказ точно не отправлен.
    throw new Error(GENERIC_ERROR);
  }

  let data: OrderApiResponse = {};
  try {
    data = (await response.json()) as OrderApiResponse;
  } catch {
    // Ответ не JSON (шлюз/прокси) — трактуем как ошибку.
  }

  if (!response.ok || data.ok !== true || typeof data.number !== "string") {
    const mapped =
      typeof data.error === "string"
        ? SERVER_ERROR_MESSAGES[data.error]
        : undefined;
    throw new Error(mapped ?? GENERIC_ERROR);
  }

  const order: PlacedOrder = {
    number: data.number,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
    method: input.method,
    subtotal:
      typeof data.subtotal === "number" ? data.subtotal : input.subtotal,
    deliveryCost:
      typeof data.deliveryCost === "number"
        ? data.deliveryCost
        : input.deliveryCost,
    total:
      typeof data.total === "number" ? data.total : input.subtotal + input.deliveryCost,
    customer: input.customer,
    items: input.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      price: line.product.price,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
  };

  saveOrderHistory(order);

  console.info(
    "[Shawarma Lab] заказ принят, заявка доставлена владельцу в Telegram:",
    order.number,
  );

  return order;
}

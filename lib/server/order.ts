/**
 * Серверная валидация и сборка заказа, пришедшего с сайта (POST /api/orders).
 *
 * Цены НИКОГДА не берутся из запроса клиента: позиции собираются из
 * data/products.ts, расчёты — из lib/cart.ts. Ответ клиента считается
 * правдивым только после проверки на сервере.
 */

import {
  clampQuantity,
  formatPhoneInput,
  getDeliveryCost,
  getLines,
  getSubtotal,
  normalizePhone,
  type CartLine,
  type DeliveryMethod,
} from "@/lib/cart";
import { getProductById } from "@/data/products";

export type SiteOrderPayload = {
  items?: unknown;
  method?: unknown;
  customer?: unknown;
};

export type ValidatedSiteOrder = {
  lines: CartLine[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  method: DeliveryMethod;
  customer: {
    name: string;
    /** Отображаемый формат +7 (999) 123-45-67. */
    phone: string;
    address: string;
    comment: string;
  };
};

export type ParseResult =
  | { ok: true; order: ValidatedSiteOrder }
  | { ok: false; error: string };

function bad(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

const MAX_ITEMS_LINES = 50;

export function parseSiteOrder(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) return bad("Пустой запрос");
  const body = raw as SiteOrderPayload;

  const method = body.method;
  if (method !== "delivery" && method !== "pickup") {
    return bad("Некорректный способ получения");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return bad("Корзина пуста");
  }
  if (body.items.length > MAX_ITEMS_LINES) {
    return bad("Слишком много позиций");
  }

  // productId -> quantity, с дедупликацией и лимитом lib/cart.
  const merged = new Map<string, number>();
  for (const item of body.items) {
    if (typeof item !== "object" || item === null) return bad("Некорректная позиция");
    const { productId, quantity } = item as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== "string" || getProductById(productId) === undefined) {
      return bad("Неизвестный товар");
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) {
      return bad("Некорректное количество");
    }
    const current = merged.get(productId) ?? 0;
    merged.set(productId, clampQuantity(current + Math.floor(quantity)));
  }

  const cartItems = [...merged.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  if (cartItems.length === 0) return bad("Корзина пуста");

  // getLines/getSubtotal/getDeliveryCost — те же функции, что у корзины сайта
  // и бота: серверная правда в ценах и доставке.
  const lines = getLines(cartItems);
  const subtotal = getSubtotal(lines);
  const deliveryCost = getDeliveryCost(subtotal, method);

  const customer = body.customer;
  if (typeof customer !== "object" || customer === null) {
    return bad("Нет данных клиента");
  }
  const { name, phone, address, apartment, comment } = customer as {
    name?: unknown;
    phone?: unknown;
    address?: unknown;
    apartment?: unknown;
    comment?: unknown;
  };

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return bad("Некорректное имя");
  }
  if (typeof phone !== "string" || !/^7\d{10}$/.test(normalizePhone(phone))) {
    return bad("Некорректный телефон");
  }
  let addressLine = "";
  if (method === "delivery") {
    if (typeof address !== "string" || address.trim().length < 5 || address.trim().length > 200) {
      return bad("Нужен адрес доставки");
    }
    const apartmentSuffix =
      typeof apartment === "string" && apartment.trim().length > 0 && apartment.trim().length <= 100
        ? `, ${apartment.trim()}`
        : "";
    addressLine = `${address.trim()}${apartmentSuffix}`;
  }
  const commentLine =
    typeof comment === "string" && comment.trim().length > 0 && comment.trim().length <= 300
      ? comment.trim()
      : "";

  return {
    ok: true,
    order: {
      lines,
      subtotal,
      deliveryCost,
      total: subtotal + deliveryCost,
      method,
      customer: {
        name: name.trim(),
        phone: formatPhoneInput(phone),
        address: addressLine,
        comment: commentLine,
      },
    },
  };
}

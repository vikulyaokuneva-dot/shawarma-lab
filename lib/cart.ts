import { getProductById, type Product } from "@/data/products";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
  lineTotal: number;
};

export type DeliveryMethod = "delivery" | "pickup";

export const CART_STORAGE_KEY = "shawarma-lab:cart:v1";
export const FREE_DELIVERY_THRESHOLD = 1500;
export const DELIVERY_COST = 199;
export const MAX_QUANTITY_PER_ITEM = 20;

/* ------------------------------------------------------------------ */
/* localStorage (client-only, безопасно для SSR)                       */
/* ------------------------------------------------------------------ */

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as CartItem).productId === "string" &&
          typeof (item as CartItem).quantity === "number" &&
          getProductById((item as CartItem).productId) !== undefined,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: clampQuantity(Math.round(item.quantity)),
      }))
      .filter((item) => item.quantity > 0);
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Приватный режим / переполнение хранилища — корзина живёт до перезагрузки.
  }
}

/* ------------------------------------------------------------------ */
/* Расчёты                                                             */
/* ------------------------------------------------------------------ */

export function getLines(items: CartItem[]): CartLine[] {
  return items.flatMap((item) => {
    const product = getProductById(item.productId);
    if (!product) return [];
    return [
      {
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      },
    ];
  });
}

export function getSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

/** Доставка: 0 ₽ для самовывоза и заказов от FREE_DELIVERY_THRESHOLD. */
export function getDeliveryCost(
  subtotal: number,
  method: DeliveryMethod,
): number {
  if (method === "pickup") return 0;
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
}

export function getRemainingForFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}

export function clampQuantity(quantity: number): number {
  return Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, quantity));
}

/* ------------------------------------------------------------------ */
/* Форматирование                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ручное разрядование неразрывным пробелом вместо Intl:
 * SSR-рендер и клиент рендерят побайтово одинаковую строку
 * (разные ICU в Node/браузерах могут расходиться в сепараторах).
 */
export function formatPrice(value: number): string {
  const nbsp = "\u00A0";
  const digits = String(Math.round(Math.abs(value)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);
  return `${value < 0 ? "−" : ""}${grouped}${nbsp}₽`;
}

/** Русская плютовализация: 1 товар / 2 товара / 5 товаров. */
export function pluralize(
  count: number,
  forms: [string, string, string],
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function formatQuantity(count: number): string {
  return `${count} ${pluralize(count, ["товар", "товара", "товаров"])}`;
}

/**
 * Прогрессивная маска телефона: +7 (999) 123-45-67.
 * На вход принимает произвольный ввод, возвращает форматированное значение.
 */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits && !digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  let result = "+7";
  if (rest.length > 0) result += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) result += `) ${rest.slice(3, 6)}`;
  if (rest.length >= 6) result += `-${rest.slice(6, 8)}`;
  if (rest.length >= 8) result += `-${rest.slice(8, 10)}`;
  return result;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

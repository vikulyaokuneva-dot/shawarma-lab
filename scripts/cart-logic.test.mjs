/**
 * Прогон чистой логики корзины против настоящих исходников lib/cart.ts
 * (node --experimental-strip-types). Запуск: node scripts/_logic-test.mjs
 */
import { register } from "node:module";
import { existsSync } from "node:fs";

register(
  `data:text/javascript,
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = new URL("file:///D:/%D0%9A%D0%B2%D0%BE%D1%80%D0%BA/%D1%88%D0%B0%D1%83%D1%80%D0%BC%D0%B8%D1%87%D0%BD%D0%B0%D1%8F/" + specifier.slice(2));
    if (existsSync(fileURLToPath(target.href) + ".ts")) target = new URL(target.href + ".ts");
    return next(target.href, context);
  }
  return next(specifier, context);
}`,
  import.meta.url,
);

/* --- мок browser-окружения --- */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage };

const {
  loadCart, saveCart, getLines, getSubtotal, getDeliveryCost,
  getRemainingForFreeDelivery, clampQuantity, formatPrice, pluralize,
  formatQuantity, formatPhoneInput, normalizePhone, CART_STORAGE_KEY,
} = await import("../lib/cart.ts");
const { products } = await import("../data/products.ts");

let failures = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: got ${a}, want ${e}`);
    failures += 1;
  } else {
    console.log(`ok   ${label}`);
  }
}

/* цены только из data/products.ts */
const price = (id) => products.find((p) => p.id === id).price;

eq(price("classic-chicken"), 390, "product prices present");
eq(price("spicy-beef"), 490, "product prices present");
eq(price("cheese-chicken"), 450, "product prices present");

/* пустая корзина / мусор */
eq(loadCart(), [], "loadCart: пусто до записи");
globalThis.localStorage.setItem(CART_STORAGE_KEY, "{{{не JSON");
eq(loadCart(), [], "loadCart: битый JSON -> []");
globalThis.localStorage.setItem(
  CART_STORAGE_KEY,
  JSON.stringify([{ productId: "hack", quantity: 5 }, { productId: "spicy-beef", quantity: 2 }, { productId: "classic-chicken", quantity: -3 }]),
);
eq(loadCart(), [{ productId: "spicy-beef", quantity: 2 }], "loadCart: чужие id и qty<=0 отсеиваются");

/* roundtrip save/load */
const cart = [
  { productId: "classic-chicken", quantity: 2 },
  { productId: "spicy-beef", quantity: 1 },
];
saveCart(cart);
eq(loadCart(), cart, "saveCart/loadCart roundtrip");

/* расчёты */
const lines = getLines(cart);
eq(lines.length, 2, "getLines: 2 позиции");
eq(lines[0].lineTotal, 2 * 390, "getLines: lineTotal из цены продукта");
eq(getSubtotal(lines), 2 * 390 + 490, "getSubtotal = 1270");

/* сценарий из ТЗ: по 1 каждой позиции 390+490+450 = 1330 */
eq(getSubtotal(getLines([{ productId: "classic-chicken", quantity: 1 }, { productId: "spicy-beef", quantity: 1 }, { productId: "cheese-chicken", quantity: 1 }])), 1330, "итог 1330 из ТЗ");

/* доставка и порог 1500 */
eq(getDeliveryCost(0, "delivery"), 0, "порог: пустая корзина -> 0");
eq(getDeliveryCost(1499, "delivery"), 199, "порог: 1499 -> 199");
eq(getDeliveryCost(1500, "delivery"), 0, "порог: 1500 -> бесплатно");
eq(getDeliveryCost(1499, "pickup"), 0, "самовывоз всегда 0");
eq(getRemainingForFreeDelivery(1330), 170, "до бесплатной: 170");
eq(clampQuantity(99), 20, "clamp qty max 20");

/* форматирование */
eq(formatPrice(1330), "1\u00A0330\u00A0₽", "формат цены неразрывными пробелами");
eq(formatQuantity(1), "1 товар", "плюрализация 1 товар");
eq(formatQuantity(2), "2 товара", "плюрализация 2 товара");
eq(formatQuantity(5), "5 товаров", "плюрализация 5 товаров");
eq(formatQuantity(11), "11 товаров", "плюрализация 11 товаров");
eq(formatQuantity(21), "21 товар", "плюрализация 21 товар");
eq(formatPhoneInput("9161234567"), "+7 (916) 123-45-67", "маска телефона из 10 цифр");
eq(formatPhoneInput("89161234567"), "+7 (916) 123-45-67", "маска: ведущая 8 -> 7");
eq(formatPhoneInput("9"), "+7 (9", "прогрессивный ввод");
eq(normalizePhone(formatPhoneInput("9161234567")), "79161234567", "валидация увидит 11 цифр");

console.log(failures === 0 ? "\nALL LOGIC TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

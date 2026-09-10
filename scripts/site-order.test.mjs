/**
 * Тесты серверного тракта «сайт → /api/orders»: валидация заказа
 * (lib/server/order.ts) и единый формат заявки владельцу
 * (lib/telegram/adminOrder.ts) против настоящих исходников.
 * Запуск: node scripts/site-order.test.mjs
 */
import { register } from "node:module";

const ROOT = new URL("../", import.meta.url).href;

register(
  `data:text/javascript,
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ROOT = ${JSON.stringify(ROOT)};
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = new URL(ROOT + specifier.slice(2));
    if (!target.href.endsWith(".ts") && existsSync(fileURLToPath(target.href) + ".ts")) {
      target = new URL(target.href + ".ts");
    }
    return next(target.href, context);
  }
  return next(specifier, context);
}`,
  import.meta.url,
);

const { parseSiteOrder } = await import("@/lib/server/order.ts");
const { formatAdminOrder } = await import("@/lib/telegram/adminOrder.ts");
const { formatPrice, DELIVERY_COST } = await import("@/lib/cart.ts");

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`ok   ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

const baseCustomer = {
  name: "Клиент сайта",
  phone: "79991234567",
  address: "Лесная ул., 5",
  apartment: "кв. 12",
  comment: "без лука",
};

/* ---------- валидация ---------- */

const okDelivery = parseSiteOrder({
  items: [{ productId: "spicy-beef", quantity: 1 }],
  method: "delivery",
  customer: baseCustomer,
});
check("доставка проходит валидацию", okDelivery.ok === true);
check(
  "цена серверная: subtotal 490",
  okDelivery.ok && okDelivery.order.subtotal === 490,
);
check(
  "доставка 199 до порога бесплатности",
  okDelivery.ok && okDelivery.order.deliveryCost === DELIVERY_COST,
);
check(
  "итого 689",
  okDelivery.ok && okDelivery.order.total === 689,
);
check(
  "телефон форматируется для показа",
  okDelivery.ok && okDelivery.order.customer.phone === "+7 (999) 123-45-67",
);
check(
  "квартира доклеивается к адресу",
  okDelivery.ok && okDelivery.order.customer.address === "Лесная ул., 5, кв. 12",
);

const okPickup = parseSiteOrder({
  items: [{ productId: "spicy-beef", quantity: 1 }],
  method: "pickup",
  customer: { name: "Клиент сайта", phone: "79991234567" },
});
check("самовывоз без адреса валиден", okPickup.ok === true);
check(
  "самовывоз бесплатный",
  okPickup.ok && okPickup.order.deliveryCost === 0,
);

const dup = parseSiteOrder({
  items: [
    { productId: "classic-chicken", quantity: 2 },
    { productId: "classic-chicken", quantity: 3 },
  ],
  method: "pickup",
  customer: { name: "Два дубля", phone: "79991234567" },
});
check(
  "дубликаты позиций сливаются в одну (2+3=5)",
  dup.ok && dup.order.lines.length === 1 && dup.order.lines[0].quantity === 5,
);

function rejects(name, payload) {
  const r = parseSiteOrder(payload);
  check(name, r.ok === false && typeof r.error === "string" && r.error.length > 0);
}
rejects("пустая корзина отклоняется", { items: [], method: "delivery", customer: baseCustomer });
rejects("неизвестный товар отклоняется", {
  items: [{ productId: "naga-sauce", quantity: 1 }],
  method: "delivery",
  customer: baseCustomer,
});
rejects("количество 0 отклоняется", {
  items: [{ productId: "classic-chicken", quantity: 0 }],
  method: "delivery",
  customer: baseCustomer,
});
rejects("кривой телефон отклоняется", {
  items: [{ productId: "classic-chicken", quantity: 1 }],
  method: "delivery",
  customer: { ...baseCustomer, phone: "123" },
});
rejects("доставка без адреса отклоняется", {
  items: [{ productId: "classic-chicken", quantity: 1 }],
  method: "delivery",
  customer: { name: "Без адреса", phone: "79991234567" },
});
rejects("мусор вместо объекта отклоняется", "not-an-object");
rejects("неизвестный method отклоняется", {
  items: [{ productId: "classic-chicken", quantity: 1 }],
  method: "drone",
  customer: baseCustomer,
});

/* ---------- формат заявки владельцу ---------- */

if (!okDelivery.ok) {
  console.error("базовый кейс не прошёл валидацию — формат не проверить");
  process.exit(1);
}
const adminText = formatAdminOrder({
  orderNumber: 1002,
  lines: okDelivery.order.lines,
  subtotal: okDelivery.order.subtotal,
  deliveryCost: okDelivery.order.deliveryCost,
  method: okDelivery.order.method,
  customerName: okDelivery.order.customer.name,
  phone: okDelivery.order.customer.phone,
  address: okDelivery.order.customer.address,
  paymentLabel: "при получении",
  source: "Сайт",
});
check("заголовок с номером", adminText.includes("🔔 НОВЫЙ ЗАКАЗ #1002"));
check(
  "позиция с ценой",
  adminText.includes(`🌯 SPICY BEEF × 1 — ${formatPrice(490)}`),
);
check(
  "строка доставки",
  adminText.includes(`🚚 Доставка — ${formatPrice(DELIVERY_COST)}`),
);
check("итого 689 в заявке", adminText.includes(`💰 ИТОГО: ${formatPrice(689)}`));
check("клиент и телефон", adminText.includes("👤 Клиент: Клиент сайта") && adminText.includes("+7 (999) 123-45-67"));
check("адрес с квартирой", adminText.includes("📍 Адрес: Лесная ул., 5, кв. 12"));
check("источник — Сайт", adminText.includes("📲 Источник: Сайт"));
check("оплата при получении", adminText.includes("💳 Оплата: при получении"));
check(
  "Telegram-источник отличим",
  formatAdminOrder({
    orderNumber: 1003,
    lines: okDelivery.order.lines,
    subtotal: okDelivery.order.subtotal,
    deliveryCost: okDelivery.order.deliveryCost,
    method: "pickup",
    customerName: "Анна",
    phone: "+7 (999) 123-45-67",
    address: "",
    paymentLabel: "картой",
    source: "Telegram",
  }).includes("📲 Источник: Telegram"),
);

if (failed > 0) {
  console.error(`\n${failed} ПРОВАЛОВ`);
  process.exit(1);
}
console.log("\nALL SITE ORDER TESTS PASSED");

/**
 * Тесты Telegram-сценария заказа против настоящих исходников
 * (node --experimental-strip-types). Запуск:
 *   node scripts/telegram-scenario.test.mjs
 *
 * Сеть не используется: транспорт подменяется моком, сценарий из
 * lib/telegram/scenario.ts прогоняется целиком — от /start до заявки
 * владельцу, включая отмену, повторный заказ, валидации и дедуп update_id.
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

const { handleUpdate } = await import("@/lib/telegram/scenario.ts");
const { __setOrderSeqForTests, isDuplicateUpdate } = await import("@/lib/telegram/store.ts");
const { formatPrice, DELIVERY_COST, FREE_DELIVERY_THRESHOLD } = await import("@/lib/cart.ts");
const { products } = await import("@/data/products.ts");

/* ------------------------------------------------------------------ */
/* Инфраструктура тестов                                               */
/* ------------------------------------------------------------------ */

let failures = 0;
function ok(cond, label) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    failures += 1;
  }
}
function eq(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
    failures += 1;
  }
}

const ADMIN = "777";

function makeDeps({ adminChatId = ADMIN, failAdmin = false } = {}) {
  const sent = [];
  const client = {
    async sendMessage(chatId, text, keyboard) {
      if (failAdmin && String(chatId) === String(adminChatId)) return false;
      sent.push({ chatId, text, keyboard });
      return true;
    },
    async answerCallbackQuery() {
      return true;
    },
  };
  return { deps: { client, adminChatId: adminChatId ?? undefined }, sent };
}

let uid = 0;
const msg = (chatId, text) => ({
  update_id: ++uid,
  message: { chat: { id: chatId }, text },
});
const cb = (chatId, data) => ({
  update_id: ++uid,
  callback_query: {
    id: `cq${uid}`,
    data,
    from: { id: chatId },
    message: { chat: { id: chatId } },
  },
});

const last = (sent) => sent[sent.length - 1];
const has = (sent, sub) => sent.some((m) => m.text.includes(sub));
const toAdmin = (sent) => sent.filter((m) => String(m.chatId) === ADMIN);
const toUser = (sent, chatId) => sent.filter((m) => m.chatId === chatId);
const buttonTexts = (keyboard) =>
  keyboard ? keyboard.inline_keyboard.flat().map((b) => b.text) : [];

/** Дойти до экрана «Проверьте заказ» с корзиной 2×SPICY + 1×CHEESE. */
async function toConfirmExample(chatId, deps) {
  await handleUpdate(msg(chatId, "/start"), deps);
  await handleUpdate(cb(chatId, "a:spicy-beef"), deps);
  await handleUpdate(cb(chatId, "q:spicy-beef:2"), deps);
  await handleUpdate(cb(chatId, "a:cheese-chicken"), deps);
  await handleUpdate(cb(chatId, "q:cheese-chicken:1"), deps);
  await handleUpdate(cb(chatId, "c:go"), deps); // как получаем
  await handleUpdate(cb(chatId, "k:d"), deps); // доставка
  await handleUpdate(msg(chatId, "Анна"), deps); // имя
  await handleUpdate(msg(chatId, "9991234567"), deps); // телефон
  await handleUpdate(msg(chatId, "ул. Лесная, 5, кв. 12"), deps); // адрес
  await handleUpdate(cb(chatId, "c:pay:card"), deps); // оплата
}

/* ------------------------------------------------------------------ */
/* 1. /start → приветствие и 4 кнопки                                  */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(msg(101, "/start"), deps);
  ok(has(sent, "Привет"), "start: greeting");
  const texts = buttonTexts(last(sent).keyboard);
  ok(texts.includes("🌯 Помочь выбрать"), "start: choose button");
  ok(texts.includes("🍟 Меню"), "start: menu button");
  ok(texts.includes("🚚 Доставка"), "start: delivery button");
  ok(texts.includes("🛒 Сделать заказ"), "start: order button");
}

/* ------------------------------------------------------------------ */
/* 2. Меню — из data/products.ts, без второго списка                  */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(cb(102, "m:menu"), deps);
  for (const p of products) {
    ok(sent.at(-1).text.includes(p.name), `menu: contains ${p.name}`);
    ok(sent.at(-1).text.includes(formatPrice(p.price)), `menu: price ${p.name}`);
  }
  const buttons = buttonTexts(last(sent).keyboard);
  ok(buttons.length === products.length, "menu: one choice button per product");
}

/* ------------------------------------------------------------------ */
/* 3. «Помочь выбрать» → рекомендация → количество → корзина (980 ₽)   */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(cb(103, "m:choose"), deps);
  ok(sent.at(-1).text.includes("Что вам больше хочется?"), "choose: prompt");
  await handleUpdate(cb(103, "r:spicy"), deps);
  ok(has(sent, "SPICY BEEF"), "choose: recommends SPICY BEEF");
  ok(has(sent, "Добавить в заказ?"), "choose: add offer");
  await handleUpdate(cb(103, "a:spicy-beef"), deps);
  ok(has(sent, "Сколько добавить?"), "choose: qty prompt");
  eq(buttonTexts(last(sent).keyboard).join(","), "1,2,3,4,5,❌ Отмена", "qty buttons");
  await handleUpdate(cb(103, "q:spicy-beef:2"), deps);
  const cart = last(sent).text;
  ok(cart.includes(`SPICY BEEF × 2 — ${formatPrice(980)}`), "cart: line 980");
  ok(cart.includes(`Доставка: ${formatPrice(DELIVERY_COST)}`), "cart: delivery 199");
  ok(cart.includes(`Итого: ${formatPrice(980 + DELIVERY_COST)}`), "cart: total 1179");
  const texts = buttonTexts(last(sent).keyboard);
  ok(texts.includes("🛒 Оформить заказ") && texts.includes("➕ Добавить ещё") && texts.includes("🗑 Очистить"), "cart: actions");
}

/* ------------------------------------------------------------------ */
/* 4. Полный checkout + заявка владельцу (пример из ТЗ: 1 629 ₽)       */
/* ------------------------------------------------------------------ */
{
  __setOrderSeqForTests(1001);
  const { deps, sent } = makeDeps();
  await toConfirmExample(104, deps);
  const summary = last(sent).text;
  ok(summary.includes("📋 Проверьте заказ"), "confirm: header");
  ok(summary.includes(`SPICY BEEF × 2 — ${formatPrice(980)}`), "confirm: spicy line");
  ok(summary.includes(`CHEESE CHICKEN × 1 — ${formatPrice(450)}`), "confirm: cheese line");
  ok(summary.includes(`Доставка — ${formatPrice(DELIVERY_COST)}`), "confirm: delivery");
  ok(summary.includes(`Итого — ${formatPrice(980 + 450 + DELIVERY_COST)}`), "confirm: total 1629");
  ok(summary.includes("👤 Имя: Анна"), "confirm: name");
  ok(summary.includes("+7 (999) 123-45-67"), "confirm: formatted phone");
  ok(summary.includes("ул. Лесная, 5, кв. 12"), "confirm: address");
  eq(buttonTexts(last(sent).keyboard).join(","), "✅ Подтвердить,✏️ Изменить,❌ Отменить", "confirm buttons");

  await handleUpdate(cb(104, "c:ok"), deps);
  const adminMsg = toAdmin(sent).at(-1);
  ok(Boolean(adminMsg), "confirm: admin got message");
  ok(adminMsg.text.includes("🔔 НОВЫЙ ЗАКАЗ #1001"), "confirm: admin number");
  ok(adminMsg.text.includes(`ИТОГО: ${formatPrice(1629)}`), "confirm: admin total");
  ok(adminMsg.text.includes("👤 Клиент: Анна"), "confirm: admin customer");
  ok(adminMsg.text.includes("📲 Источник: Telegram"), "confirm: admin source");
  ok(has(sent, "✅ Заказ #1001 принят!"), "confirm: user accepted");

  // Повторный заказ: корзина после приёмки пуста, счётчик растёт.
  await handleUpdate(cb(104, "m:order"), deps);
  ok(has(sent, "Пока пусто"), "repeat: cart was cleared");
}

/* ------------------------------------------------------------------ */
/* 5. Самовывоз: без адреса, доставка 0 ₽                              */
/* ------------------------------------------------------------------ */
{
  __setOrderSeqForTests(1050);
  const { deps, sent } = makeDeps();
  await handleUpdate(msg(105, "/start"), deps);
  await handleUpdate(cb(105, "a:classic-chicken"), deps);
  await handleUpdate(cb(105, "q:classic-chicken:1"), deps);
  await handleUpdate(cb(105, "c:go"), deps);
  await handleUpdate(cb(105, "k:p"), deps);
  await handleUpdate(msg(105, "Игорь"), deps);
  await handleUpdate(msg(105, "+79991234567"), deps);
  ok(last(sent).text.includes("💳 Как удобно оплатить?"), "pickup: skips address");
  await handleUpdate(cb(105, "c:pay:cash"), deps);
  const summary = last(sent).text;
  ok(summary.includes("🏠 Самовывоз — 0 ₽"), "pickup: 0 delivery");
  ok(summary.includes(`Итого — ${formatPrice(390)}`), "pickup: total 390");
  ok(summary.includes("наличными"), "pickup: cash payment");
  await handleUpdate(cb(105, "c:ok"), deps);
  ok(toAdmin(sent).at(-1).text.includes("#1050"), "pickup: admin got #1050");
}

/* ------------------------------------------------------------------ */
/* 6. Отмена checkout: владельцу тишина, корзина цела                  */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await toConfirmExample(106, deps);
  await handleUpdate(cb(106, "c:cancel"), deps);
  ok(has(sent, "❌ Отменил"), "cancel: acknowledged");
  eq(toAdmin(sent).length, 0, "cancel: nothing sent to admin");
  await handleUpdate(cb(106, "m:order"), deps);
  ok(has(sent, "SPICY BEEF × 2"), "cancel: cart preserved");
}

/* ------------------------------------------------------------------ */
/* 7. Валидации                                                        */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(msg(107, "/start"), deps);
  await handleUpdate(cb(107, "a:spicy-beef"), deps);
  await handleUpdate(cb(107, "q:spicy-beef:1"), deps);
  await handleUpdate(cb(107, "c:go"), deps);
  await handleUpdate(cb(107, "k:d"), deps);
  await handleUpdate(msg(107, "А"), deps);
  ok(has(sent, "минимум 2 символа"), "validate: short name rejected");
  await handleUpdate(msg(107, "Анна"), deps);
  await handleUpdate(msg(107, "123"), deps);
  ok(has(sent, "неполный"), "validate: bad phone rejected");
  await handleUpdate(msg(107, "9991234567"), deps);
  await handleUpdate(msg(107, "ул"), deps);
  ok(has(sent, "слишком короткий"), "validate: short address rejected");
  await handleUpdate(msg(107, "ул. Мира, 12"), deps);
  ok(has(sent, "Как удобно оплатить?"), "validate: proceeds when valid");
}

/* ------------------------------------------------------------------ */
/* 8. ВЛАДЕЛЕЦ НЕ НАСТРОЕН → никакой фейковой приёмки                 */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps({ adminChatId: null });
  await toConfirmExample(108, deps);
  await handleUpdate(cb(108, "c:ok"), deps);
  ok(toAdmin(sent).length === 0, "no-admin: nothing sent");
  ok(has(sent, "НЕ принят"), "no-admin: honest rejection");
  ok(has(sent, "TELEGRAM_ADMIN_CHAT_ID"), "no-admin: names the env var");
  ok(!has(sent, "принят!"), "no-admin: no fake success");
  // После настройки пользователь может повторить подтверждение.
  ok(last(sent).keyboard === undefined, "no-admin: stays on error, session kept");
}

/* ------------------------------------------------------------------ */
/* 9. Сбой доставки заявки владельцу → тоже без ложного «принят»       */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps({ failAdmin: true });
  await toConfirmExample(109, deps);
  await handleUpdate(cb(109, "c:ok"), deps);
  ok(has(sent, "НЕ принят"), "admin-fail: honest rejection");
  ok(!has(sent, "принят!"), "admin-fail: no fake success");
}

/* ------------------------------------------------------------------ */
/* 10. Идемпотентность update_id                                       */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  const update = msg(110, "/start");
  await handleUpdate(update, deps);
  const after = sent.length;
  await handleUpdate(update, deps); // ретрай Telegram с тем же update_id
  eq(sent.length, after, "dedup: same update_id processed once");
  ok(isDuplicateUpdate(update.update_id), "dedup: guard state");
}

/* ------------------------------------------------------------------ */
/* 11. Бесплатная доставка от порога                                    */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(msg(111, "/start"), deps);
  await handleUpdate(cb(111, "a:spicy-beef"), deps);
  await handleUpdate(cb(111, "q:spicy-beef:2"), deps); // 980
  await handleUpdate(cb(111, "a:cheese-chicken"), deps);
  await handleUpdate(cb(111, "q:cheese-chicken:2"), deps); // +900 = 1880
  const cart = last(sent).text;
  ok(cart.includes("Доставка: 0 ₽ — бесплатно"), "threshold: free delivery shown");
  ok(cart.includes(`Итого: ${formatPrice(1880)}`), "threshold: total without delivery");
}

/* ------------------------------------------------------------------ */
/* 12. Прочее: подсказка на неизвестный текст и «Доставка»              */
/* ------------------------------------------------------------------ */
{
  const { deps, sent } = makeDeps();
  await handleUpdate(msg(112, "что у вас есть"), deps);
  ok(has(sent, "Я не понял"), "fallback: unknown text");
  await handleUpdate(msg(112, "меню"), deps);
  ok(has(sent, "Меню Shawarma Lab"), "fallback: word 'меню' opens menu");
  await handleUpdate(cb(112, "m:delivery"), deps);
  const d = last(sent).text;
  ok(d.includes("30–40"), "delivery: time from site");
  ok(d.includes(formatPrice(DELIVERY_COST)), "delivery: 199 constant");
  ok(d.includes(formatPrice(FREE_DELIVERY_THRESHOLD)), "delivery: 1500 constant");
}

/* ------------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n${failures} TELEGRAM SCENARIO TEST(S) FAILED`);
  process.exit(1);
}
console.log("\nALL TELEGRAM SCENARIO TESTS PASSED");

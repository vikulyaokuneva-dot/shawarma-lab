/**
 * Сценарный движок Telegram-бота Shawarma Lab (демо-заказ).
 *
 * Обновление от пользователя → действия бота. Вся бизнес-логика заказов
 * переиспользует существующие источники проекта:
 *   - товары и цены: data/products.ts (через getProductById);
 *   - расчёты корзины/доставки: lib/cart.ts (getLines, getSubtotal,
 *     getDeliveryCost, formatPrice, валидация телефона);
 *   - состояние диалога: lib/telegram/store.ts (см. честный комментарий там).
 *
 * Чистая логика отделена от транспорта (deps.client), поэтому движок
 * тестируется без сети: scripts/telegram-scenario.test.mjs.
 */

import {
  DELIVERY_COST,
  FREE_DELIVERY_THRESHOLD,
  clampQuantity,
  formatPhoneInput,
  formatPrice,
  getDeliveryCost,
  getLines,
  getRemainingForFreeDelivery,
  getSubtotal,
  normalizePhone,
  type CartItem,
  type CartLine,
} from "@/lib/cart";
import { getProductById, products } from "@/data/products";
import type { InlineKeyboard } from "@/lib/telegram/client";
import {
  getOrCreateSession,
  getSession,
  nextOrderNumber,
  resetSession,
  updateSession,
  isDuplicateUpdate,
  type BotSession,
} from "@/lib/telegram/store";

/* ------------------------------------------------------------------ */
/* Типы входящих update и зависимости                                  */
/* ------------------------------------------------------------------ */

export type TgUpdate = {
  update_id?: number;
  message?: { chat?: { id?: number }; text?: string };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number };
    message?: { chat?: { id?: number } };
  };
};

export type ScenarioClient = {
  sendMessage(
    chatId: number | string,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<boolean>;
  answerCallbackQuery(id: string, text?: string): Promise<boolean>;
};

export type ScenarioDeps = {
  client: ScenarioClient;
  /** TELEGRAM_ADMIN_CHAT_ID: получатель заявок. Без него заказ НЕ принимается. */
  adminChatId: string | undefined;
};

/* ------------------------------------------------------------------ */
/* Кнопки                                                              */
/* ------------------------------------------------------------------ */

function kb(...rows: Array<Array<[string, string]>>): InlineKeyboard {
  return {
    inline_keyboard: rows.map((row) =>
      row.map(([text, callback_data]) => ({ text, callback_data })),
    ),
  };
}

const MAIN_KB = kb(
  [
    ["🌯 Помочь выбрать", "m:choose"],
    ["🍟 Меню", "m:menu"],
  ],
  [
    ["🚚 Доставка", "m:delivery"],
    ["🛒 Сделать заказ", "m:order"],
  ],
);

const WELCOME_TEXT =
  "👋 Привет! Я бот Shawarma Lab.\n\n" +
  "Помогу выбрать шаурму, собрать заказ и передать его на кухню.";

/** Помощь «выбрать» — те же соответствия, что в виджете сайта (AiAssistant). */
const RECOMMEND: Record<string, string> = {
  spicy: "spicy-beef",
  cheese: "cheese-chicken",
  classic: "classic-chicken",
};

const CHOOSE_TEXT = "Что вам больше хочется?";
const CHOOSE_KB = kb(
  [["🔥 Погорячее", "r:spicy"]],
  [["🧀 С сыром", "r:cheese"]],
  [["🥗 Классический вариант", "r:classic"]],
);

const DELIVERY_ADDRESS = "Москва, Лесная ул., 5";

function productEmoji(productId: string): string {
  return productId === "cheese-chicken" ? "🧀" : "🌯";
}

/* ------------------------------------------------------------------ */
/* Сборка текстов                                                      */
/* ------------------------------------------------------------------ */

function menuText(): string {
  // Никакого второго списка товаров — рендерим data/products.ts как есть.
  const lines = products.map(
    (p) => `${productEmoji(p.id)} ${p.name} — ${formatPrice(p.price)}\n${p.description}`,
  );
  return `🍟 Меню Shawarma Lab:\n\n${lines.join("\n\n")}`;
}

function menuKeyboard(): InlineKeyboard {
  const rows = products.map(
    (p): [string, string][] => [[`➕ Добавить: ${p.name}`, `a:${p.id}`]],
  );
  return kb(...rows);
}

function deliveryText(): string {
  return (
    "🚚 Доставка Shawarma Lab:\n\n" +
    "⏱ Привозим за 30–40 минут\n" +
    "🕐 Ежедневно с 10:00 до 23:00\n" +
    `🛵 Доставка — ${formatPrice(DELIVERY_COST)}, бесплатно от ${formatPrice(FREE_DELIVERY_THRESHOLD)}\n` +
    `🏪 Самовывоз — 0 ₽ (${DELIVERY_ADDRESS})\n` +
    "💳 Оплата: картой или наличными"
  );
}

function cartLinesText(lines: CartLine[]): string {
  return lines
    .map(
      (l) =>
        `${productEmoji(l.product.id)} ${l.product.name} × ${l.quantity} — ${formatPrice(l.lineTotal)}`,
    )
    .join("\n");
}

function cartText(cart: CartItem[]): string {
  const lines = getLines(cart);
  const subtotal = getSubtotal(lines);
  const deliveryCost = getDeliveryCost(subtotal, "delivery");
  // Компактность — часть UX: в Telegram нельзя докрутить ниже последнего
  // сообщения, и высокая простыня с пустыми строками уводит inline-кнопку
  // «🛒 Оформить заказ» за нижний клиппинг чата. Здесь только то, что нужно
  // перед оформлением: позиции, доставка, итог.
  const parts: string[] = ["🛒 Ваш заказ:", cartLinesText(lines)];
  if (deliveryCost === 0) {
    parts.push("🚚 Доставка: 0 ₽ — бесплатно 🎉");
  } else {
    parts.push(
      `🚚 Доставка: ${formatPrice(deliveryCost)} (от ${formatPrice(FREE_DELIVERY_THRESHOLD)} — 0 ₽)`,
    );
    const remaining = getRemainingForFreeDelivery(subtotal);
    if (remaining > 0) parts.push(`💡 До бесплатной: ${formatPrice(remaining)}`);
  }
  parts.push(`💰 Итого: ${formatPrice(subtotal + deliveryCost)}`);
  return parts.join("\n");
}

const CART_KB = kb(
  // Главный CTA — отдельным полноширинным рядом сразу под итогом;
  // второстепенные действия — ниже, чтобы не конкурировать с «оформить».
  [["🛒 Оформить заказ", "c:go"]],
  [["➕ Добавить ещё", "m:menu"], ["🗑 Очистить", "c:clear"]],
);

function summaryText(session: BotSession): {
  lines: CartLine[];
  subtotal: number;
  deliveryCost: number;
  text: string;
} {
  const lines = getLines(session.cart);
  const subtotal = getSubtotal(lines);
  const method = session.checkout.method ?? "delivery";
  const deliveryCost = getDeliveryCost(subtotal, method);
  const paymentLabel = session.checkout.payment === "cash" ? "наличными" : "картой";
  const addressLabel =
    method === "pickup"
      ? `📍 Самовывоз: ${DELIVERY_ADDRESS}`
      : `📍 Адрес: ${session.checkout.address}`;
  const text =
    `📋 Проверьте заказ\n\n${cartLinesText(lines)}\n\n` +
    `${method === "pickup" ? "🏠 Самовывоз — 0 ₽" : `🚚 Доставка — ${formatPrice(deliveryCost)}`}\n` +
    `💰 Итого — ${formatPrice(subtotal + deliveryCost)}\n\n` +
    `👤 Имя: ${session.checkout.name}\n` +
    `📞 Телефон: ${session.checkout.phone}\n` +
    `${addressLabel}\n` +
    `💳 Оплата: ${paymentLabel}`;
  return { lines, subtotal, deliveryCost, text };
}

function adminOrderText(orderNumber: number, session: BotSession): string {
  const { lines, subtotal, deliveryCost } = summaryText(session);
  const method = session.checkout.method ?? "delivery";
  const addressLabel =
    method === "pickup"
      ? `📍 Получение: самовывоз (${DELIVERY_ADDRESS})`
      : `📍 Адрес: ${session.checkout.address}`;
  return (
    `🔔 НОВЫЙ ЗАКАЗ #${orderNumber}\n\n` +
    `${cartLinesText(lines)}\n\n` +
    `${method === "pickup" ? "🏠 Самовывоз — 0 ₽" : `🚚 Доставка — ${formatPrice(deliveryCost)}`}\n` +
    `💰 ИТОГО: ${formatPrice(subtotal + deliveryCost)}\n\n` +
    `👤 Клиент: ${session.checkout.name}\n` +
    `📞 Телефон: ${session.checkout.phone}\n` +
    `${addressLabel}\n` +
    `💳 Оплата: ${session.checkout.payment === "cash" ? "наличными" : "картой"}\n` +
    `📲 Источник: Telegram`
  );
}

/* ------------------------------------------------------------------ */
/* Обработчик сценария                                                 */
/* ------------------------------------------------------------------ */

const RECOVERY_TEXT =
  "🔄 Демо-сессия сбросилась (в serverless-режиме состояние живёт ограниченное время).\n\n" +
  WELCOME_TEXT;

async function needsSession(
  chatId: number,
  deps: ScenarioDeps,
): Promise<BotSession | null> {
  const session = getSession(chatId);
  if (!session) {
    // state потерян (холодный старт/истёк TTL) — честно возвращаем в меню.
    await sessionLost(chatId, deps);
  }
  return session;
}

function sessionLost(chatId: number, deps: ScenarioDeps): Promise<boolean> {
  return deps.client.sendMessage(chatId, RECOVERY_TEXT, MAIN_KB);
}

function addToCart(cart: CartItem[], productId: string, quantity: number): CartItem[] {
  const next = cart.map((item) => ({ ...item }));
  const existing = next.find((item) => item.productId === productId);
  if (existing) existing.quantity += quantity;
  else next.push({ productId, quantity });
  // Лимиты и отсечение — из lib/cart (MAX_QUANTITY_PER_ITEM).
  return next
    .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) }))
    .filter((item) => item.quantity > 0);
}

async function showCart(
  chatId: number,
  session: BotSession,
  deps: ScenarioDeps,
): Promise<void> {
  if (getLines(session.cart).length === 0) {
    await deps.client.sendMessage(
      chatId,
      "🛒 Пока пусто. Выберите шаурму:",
      menuKeyboard(),
    );
    return;
  }
  await deps.client.sendMessage(chatId, cartText(session.cart), CART_KB);
}

async function startCheckout(
  chatId: number,
  session: BotSession,
  deps: ScenarioDeps,
): Promise<void> {
  if (getLines(session.cart).length === 0) {
    await deps.client.sendMessage(chatId, "🛒 Сначала добавьте товар из меню:", menuKeyboard());
    return;
  }
  session.step = "askMethod";
  updateSession(chatId, session);
  await deps.client.sendMessage(
    chatId,
    "Как получаем заказ?",
    kb(
      [["🚚 Доставка", "k:d"], ["🏠 Самовывоз", "k:p"]],
      [["🛒 К корзине", "m:order"]],
    ),
  );
}

async function afterCheckoutFields(
  chatId: number,
  session: BotSession,
  deps: ScenarioDeps,
): Promise<void> {
  session.step = "confirm";
  updateSession(chatId, session);
  const { text } = summaryText(session);
  await deps.client.sendMessage(
    chatId,
    text,
    kb(
      [["✅ Подтвердить", "c:ok"], ["✏️ Изменить", "c:edit"]],
      [["❌ Отменить", "c:cancel"]],
    ),
  );
}

async function confirmOrder(
  chatId: number,
  session: BotSession,
  deps: ScenarioDeps,
): Promise<void> {
  if (!deps.adminChatId) {
    // Никакой фейковой приёмки: владелец не настроен — заказ НЕ принят.
    console.error(
      "Telegram order NOT sent: TELEGRAM_ADMIN_CHAT_ID is not configured",
    );
    await deps.client.sendMessage(
      chatId,
      "⚠️ Не удалось передать заявку владельцу: в демо не настроен получатель " +
        "(переменная окружения TELEGRAM_ADMIN_CHAT_ID). Заказ НЕ принят.\n" +
        "Корзина сохранена — попробуйте «✅ Подтвердить» после настройки.",
    );
    return;
  }

  const orderNumber = nextOrderNumber();
  const delivered = await deps.client.sendMessage(
    deps.adminChatId,
    adminOrderText(orderNumber, session),
  );

  if (!delivered) {
    await deps.client.sendMessage(
      chatId,
      "⚠️ Заявка не ушла владельцу (Telegram API вернул ошибку). " +
        "Заказ НЕ принят, попробуйте ещё раз: «✅ Подтвердить».",
    );
    return;
  }

  await deps.client.sendMessage(
    chatId,
    `✅ Заказ #${orderNumber} принят!\nМы получили ваш заказ и скоро свяжемся с вами.`,
    kb([["🛒 Сделать ещё заказ", "m:order"], ["🍟 Меню", "m:menu"]]),
  );

  resetSession(chatId);
}

/* ---------- кнопки ---------- */

async function handleCallbackData(
  chatId: number,
  data: string,
  deps: ScenarioDeps,
): Promise<void> {
  const [group, ...rest] = data.split(":");
  const arg = rest.join(":");

  switch (data) {
    case "m:main":
    case "m:start":
      resetSession(chatId);
      await deps.client.sendMessage(chatId, WELCOME_TEXT, MAIN_KB);
      return;
    case "m:menu": {
      await deps.client.sendMessage(chatId, menuText(), menuKeyboard());
      return;
    }
    case "m:delivery":
      await deps.client.sendMessage(chatId, deliveryText(), kb([["🌯 Помочь выбрать", "m:choose"], ["🛒 Сделать заказ", "m:order"]]));
      return;
    case "m:choose":
      await deps.client.sendMessage(chatId, CHOOSE_TEXT, CHOOSE_KB);
      return;
    case "m:order": {
      const session = getOrCreateSession(chatId);
      updateSession(chatId, session);
      await showCart(chatId, session, deps);
      return;
    }
    case "c:go": {
      const session = await needsSession(chatId, deps);
      if (!session) return;
      await startCheckout(chatId, session, deps);
      return;
    }
    case "c:clear": {
      const session = getOrCreateSession(chatId);
      session.cart = [];
      session.step = "idle";
      updateSession(chatId, session);
      await deps.client.sendMessage(chatId, "🗑 Корзина очищена. Выберите шаурму:", menuKeyboard());
      return;
    }
    case "c:ok": {
      const session = await needsSession(chatId, deps);
      if (!session || session.step !== "confirm") return;
      await confirmOrder(chatId, session, deps);
      return;
    }
    case "c:edit": {
      const session = await needsSession(chatId, deps);
      if (!session || session.step !== "confirm") return;
      session.checkout.name = "";
      session.checkout.phone = "";
      session.checkout.address = "";
      session.checkout.payment = null;
      session.step = "askName";
      updateSession(chatId, session);
      await deps.client.sendMessage(chatId, "✏️ Хорошо, заново.\n\n👤 Как вас зовут?");
      return;
    }
    case "c:cancel": {
      const session = await needsSession(chatId, deps);
      if (!session) return;
      // Отмена незавершённого checkout: корзина сохраняется, владельцу — тишина.
      session.step = "idle";
      session.checkout = { method: null, name: "", phone: "", address: "", payment: null };
      updateSession(chatId, session);
      await deps.client.sendMessage(
        chatId,
        "❌ Отменил оформление. Корзина сохранена — вернёмся к заказу, когда скажете.",
        MAIN_KB,
      );
      return;
    }
    case "k:d":
    case "k:p": {
      const session = await needsSession(chatId, deps);
      if (!session || session.step !== "askMethod") return;
      session.checkout.method = data === "k:d" ? "delivery" : "pickup";
      session.step = "askName";
      updateSession(chatId, session);
      await deps.client.sendMessage(chatId, "👤 Как вас зовут?");
      return;
    }
    case "c:pay:card":
    case "c:pay:cash": {
      const session = await needsSession(chatId, deps);
      if (!session || session.step !== "askPayment") return;
      session.checkout.payment = data.endsWith("cash") ? "cash" : "card";
      await afterCheckoutFields(chatId, session, deps);
      return;
    }
    case "an": {
      await deps.client.sendMessage(chatId, "Ок! Меню:", menuKeyboard());
      return;
    }
    default:
      break;
  }

  // Выбор из «Помочь выбрать»: r:spicy | r:cheese | r:classic
  if (group === "r") {
    const productId = RECOMMEND[arg];
    const product = productId ? getProductById(productId) : undefined;
    if (!product) return;
    await deps.client.sendMessage(
      chatId,
      `${productEmoji(product.id)} ${product.name} — ${formatPrice(product.price)}\n${product.description}\n\nДобавить в заказ?`,
      kb(
        [["➕ Добавить в заказ", `a:${product.id}`], ["🍟 Всё меню", "m:menu"]],
        [["🌯 Выбрать другое", "m:choose"]],
      ),
    );
    return;
  }

  // «Добавить в заказ» → сколько: a:<productId>
  if (group === "a") {
    const product = getProductById(arg);
    if (!product) return;
    await deps.client.sendMessage(
      chatId,
      `${product.name} — ${formatPrice(product.price)}\nСколько добавить?`,
      kb([["1", "q:" + arg + ":1"], ["2", "q:" + arg + ":2"], ["3", "q:" + arg + ":3"], ["4", "q:" + arg + ":4"], ["5", "q:" + arg + ":5"]], [["❌ Отмена", "an"]]),
    );
    return;
  }

  // q:<productId>:<count> — фактическое добавление в корзину
  if (group === "q") {
    const [productId, countRaw] = rest;
    const product = getProductById(productId);
    const count = Number(countRaw);
    if (!product || !Number.isInteger(count) || count < 1 || count > 5) return;
    const session = getOrCreateSession(chatId);
    session.cart = addToCart(session.cart, product.id, count);
    session.step = "idle";
    updateSession(chatId, session);
    await showCart(chatId, session, deps);
    return;
  }
}

/* ---------- текстовые сообщения ---------- */

async function handleText(
  chatId: number,
  rawText: string,
  deps: ScenarioDeps,
): Promise<void> {
  const text = rawText.trim();
  const lowered = text.toLowerCase();

  const session = getSession(chatId);

  // Шаги оформления принимают обычный текст (имя/телефон/адрес).
  if (session && session.step !== "idle") {
    if (session.step === "askName") {
      if (text.length < 2) {
        await deps.client.sendMessage(chatId, "Имя минимум 2 символа. 👤 Как вас зовут?");
        return;
      }
      session.checkout.name = text;
      session.step = "askPhone";
      updateSession(chatId, session);
      await deps.client.sendMessage(chatId, `Отлично, ${text}!\n📞 Ваш телефон? (например, +7 999 123-45-67)`);
      return;
    }
    if (session.step === "askPhone") {
      // Валидация как на сайте: маска formatPhoneInput (+7, 8 → 7), но
      // требуем не меньше 10 набранных цифр — «9991234567» проходим, «123» нет.
      const formatted = formatPhoneInput(text);
      const digits = normalizePhone(formatted);
      const valid =
        /^7\d{10}$/.test(digits) && normalizePhone(text).length >= 10;
      if (!valid) {
        await deps.client.sendMessage(chatId, "Похоже, номер неполный 🤔 Введите телефон в формате +7 (999) 123-45-67.");
        return;
      }
      session.checkout.phone = formatted;
      if (session.checkout.method === "pickup") {
        session.step = "askPayment";
        updateSession(chatId, session);
        await deps.client.sendMessage(chatId, "💳 Как удобно оплатить?", kb([["💳 Картой", "c:pay:card"], ["💵 Наличными", "c:pay:cash"]]));
      } else {
        session.step = "askAddress";
        updateSession(chatId, session);
        await deps.client.sendMessage(chatId, `📍 Адрес доставки?`);
      }
      return;
    }
    if (session.step === "askAddress") {
      if (text.length < 5) {
        await deps.client.sendMessage(chatId, "Адрес слишком короткий 🙂 📍 Введите адрес полностью:");
        return;
      }
      session.checkout.address = text;
      session.step = "askPayment";
      updateSession(chatId, session);
      await deps.client.sendMessage(chatId, "💳 Как удобно оплатить?", kb([["💳 Картой", "c:pay:card"], ["💵 Наличными", "c:pay:cash"]]));
      return;
    }
    // На confirm/askPayment текст не ждём — там кнопки.
    await deps.client.sendMessage(
      chatId,
      "Дальше выберите вариант кнопками под сообщением 🙂",
    );
    return;
  }

  // Команды и быстрые фразы поверх меню.
  if (lowered === "/start" || lowered === "/help" || /^(привет|здравств|hi|hello)/.test(lowered)) {
    resetSession(chatId);
    await deps.client.sendMessage(chatId, WELCOME_TEXT, MAIN_KB);
    return;
  }
  if (lowered.includes("меню")) {
    await handleCallbackData(chatId, "m:menu", deps);
    return;
  }
  if (lowered.includes("доставк") || lowered.includes("оплат")) {
    await handleCallbackData(chatId, "m:delivery", deps);
    return;
  }
  if (lowered.includes("заказ") || lowered.includes("корзин")) {
    await handleCallbackData(chatId, "m:order", deps);
    return;
  }
  if (lowered.includes("выбрать") || lowered.includes("посовет")) {
    await handleCallbackData(chatId, "m:choose", deps);
    return;
  }
  if (lowered === "отмена" || lowered === "cancel") {
    await handleCallbackData(chatId, "c:cancel", deps);
    return;
  }

  await deps.client.sendMessage(
    chatId,
    "Я не понял 🙂 Выберите действие:",
    MAIN_KB,
  );
}

/* ------------------------------------------------------------------ */
/* Точка входа                                                         */
/* ------------------------------------------------------------------ */

export async function handleUpdate(update: TgUpdate, deps: ScenarioDeps): Promise<void> {
  const updateId = update?.update_id;
  if (updateId !== undefined && isDuplicateUpdate(updateId)) return;

  const callback = update?.callback_query;
  if (callback?.data) {
    const chatId = callback.from?.id ?? callback.message?.chat?.id;
    if (chatId === undefined) return;
    await handleCallbackData(chatId, callback.data, deps);
    if (callback.id) await deps.client.answerCallbackQuery(callback.id);
    return;
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  if (chatId === undefined) return;
  await handleText(chatId, message?.text ?? "", deps);
}

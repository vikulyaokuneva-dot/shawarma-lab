/**
 * Состояние Telegram-бота для демо-сценария заказа.
 *
 * Честно про serverless (Vercel): обычная in-memory Map НЕ является
 * надёжным постоянным хранилищем — у каждого экземпляра функции своя копия,
 * она обнуляется на холодном старте. Для демо это осознанно допустимо,
 * поэтому сценарий построен так, чтобы ПОТЕРЯ состояния была безвредной:
 *   - в Map хранится только текущий незавершённый диалог (корзина/анкета);
 *   - при отсутствии сессии бот мягко возвращает пользователя в /start;
 *   - ни один заказ не считается принятым, пока заявка не отправлена владельцу.
 * Для продакшена этот слой заменяется на KV/БД — интерфейс модуля при этом
 * не меняется (get/update/duplicate guard).
 */

import type { CartItem, DeliveryMethod } from "@/lib/cart";

export type CheckoutStep =
  | "idle"
  | "askMethod"
  | "askName"
  | "askPhone"
  | "askAddress"
  | "askPayment"
  | "confirm";

export type CheckoutDraft = {
  method: DeliveryMethod | null;
  name: string;
  phone: string;
  address: string;
  payment: "card" | "cash" | null;
};

export type BotSession = {
  step: CheckoutStep;
  cart: CartItem[];
  pendingProductId: string | null;
  checkout: CheckoutDraft;
  updatedAt: number;
};

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 часа неактивности — сессия сбрасывается
const MAX_SESSIONS = 500;
/** Telegram повтор delivery одного update возможен в течение минуты. */
const DEDUP_TTL_MS = 60_000;
const MAX_SEEN_UPDATES = 2000;
const FIRST_ORDER_NUMBER = 1001;

export function emptySession(): BotSession {
  return {
    step: "idle",
    cart: [],
    pendingProductId: null,
    checkout: { method: null, name: "", phone: "", address: "", payment: null },
    updatedAt: Date.now(),
  };
}

const sessions = new Map<number, BotSession>();
const seenUpdates = new Map<number, number>();

function pruneSessions(now: number): void {
  for (const [chatId, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(chatId);
  }
  // Жёсткий потолок: вытесняем самые старые (Map сохраняет порядок вставки).
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) break;
    sessions.delete(oldest);
  }
}

export function getSession(chatId: number): BotSession | null {
  const session = sessions.get(chatId);
  if (!session) return null;
  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(chatId);
    return null;
  }
  return session;
}

export function getOrCreateSession(chatId: number): BotSession {
  return getSession(chatId) ?? emptySession();
}

export function updateSession(chatId: number, session: BotSession): void {
  session.updatedAt = Date.now();
  sessions.set(chatId, session);
  pruneSessions(session.updatedAt);
}

export function resetSession(chatId: number): BotSession {
  const fresh = emptySession();
  updateSession(chatId, fresh);
  return fresh;
}

/**
 * Защита от повторной обработки одного update (Telegram ретраит вебхук,
 * если ответ не дошёл). true — такой update уже видели, обрабатывать нельзя.
 */
export function isDuplicateUpdate(updateId: number): boolean {
  const now = Date.now();
  for (const [id, ts] of seenUpdates) {
    if (now - ts > DEDUP_TTL_MS) seenUpdates.delete(id);
  }
  if (seenUpdates.has(updateId)) return true;
  seenUpdates.set(updateId, now);
  while (seenUpdates.size > MAX_SEEN_UPDATES) {
    const oldest = seenUpdates.keys().next().value;
    if (oldest === undefined) break;
    seenUpdates.delete(oldest);
  }
  return false;
}

/* Номер заказа для демо: монотонный счётчик внутри экземпляра функции.
 * Совпадает с форматом примера ТЗ (#1001). В проде — последовательность в БД. */
let orderSeq = FIRST_ORDER_NUMBER;

export function nextOrderNumber(): number {
  return orderSeq++;
}

/** Только для тестов: перемотка счётчика. */
export function __setOrderSeqForTests(value: number): void {
  orderSeq = value;
}

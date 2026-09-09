"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { products, type Product } from "@/data/products";
import { DELIVERY_COST, FREE_DELIVERY_THRESHOLD, formatPrice } from "@/lib/cart";
import { useCart } from "@/lib/cart-context";
import { siteLinks } from "@/lib/siteLinks";
import { cn } from "@/lib/utils";

/**
 * Плавающий AI-ассистент (витринное демо).
 *
 * Никаких внешних AI-API: ответы генерируются сценарным движком ниже,
 * состояние диалога живёт только в React. Ссылки и цены берутся из
 * единых источников проекта (data/products.ts, lib/cart.ts, lib/siteLinks.ts),
 * условия доставки — из секции «Доставка» этого же сайта (помечены как демо).
 */

type ActionId =
  | "choose"
  | "menu"
  | "delivery"
  | "telegram"
  | "spicy"
  | "cheese"
  | "light"
  | "dontknow";

type Message =
  | { id: number; role: "bot" | "user"; kind: "text"; text: string }
  | { id: number; role: "bot"; kind: "menu" }
  | { id: number; role: "bot"; kind: "recommend"; product: Product }
  | { id: number; role: "bot"; kind: "delivery"; intro: string; lines: string[] }
  | { id: number; role: "bot"; kind: "telegram"; text: string };

/** Omit, распределённый по union-членам (обычный Omit «схлопывает» union). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type NewMessage = DistributiveOmit<Message, "id">;

const ACTIONS: Record<ActionId, string> = {
  choose: "🌯 Помочь выбрать",
  menu: "🍟 Посмотреть меню",
  delivery: "🚚 Доставка",
  telegram: "📲 Telegram",
  spicy: "🔥 Погорячее",
  cheese: "🧀 С сыром",
  light: "🥗 Полегче",
  dontknow: "🤷 Не знаю",
};

const ROOT_REPLIES: ActionId[] = ["choose", "menu", "delivery", "telegram"];
const CHOOSE_REPLIES: ActionId[] = ["spicy", "cheese", "light", "dontknow"];

function findProduct(id: string): Product {
  const product = products.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product id: ${id}`);
  return product;
}

/** Сценарные ответы помощника. Возвращает реплики бота + следующие кнопки. */
function script(action: ActionId): { bot: NewMessage[]; replies: ActionId[] } {
  const recommend = (text: string, productId: string) => ({
    bot: [
      { role: "bot", kind: "text", text } as NewMessage,
      {
        role: "bot",
        kind: "recommend",
        product: findProduct(productId),
      } as NewMessage,
    ],
    replies: ROOT_REPLIES,
  });

  switch (action) {
    case "menu":
      return {
        bot: [
          {
            role: "bot",
            kind: "text",
            text: `У нас три шаурмы — все готовим при вас. Вот меню:`,
          },
          { role: "bot", kind: "menu" },
        ],
        replies: ["choose", "delivery", "telegram"],
      };
    case "choose":
      return {
        bot: [
          {
            role: "bot",
            kind: "text",
            text: "Что для вас важнее?",
          },
        ],
        replies: CHOOSE_REPLIES,
      };
    case "spicy":
      return recommend(
        "🔥 Понял — вы за характер! Ваш вариант:",
        "spicy-beef",
      );
    case "cheese":
      return recommend(
        "🧀 Расплавленный сыр — наш хит. Рекомендую:",
        "cheese-chicken",
      );
    case "light":
      return recommend(
        "🥗 Свежесть и лёгкость — это курица и овощи:",
        "classic-chicken",
      );
    case "dontknow":
      return recommend(
        "🤝 Тогда начните с классики — это выбор большинства:",
        "classic-chicken",
      );
    case "delivery":
      return {
        bot: [
          {
            role: "bot",
            kind: "delivery",
            intro: "Так доставка описана на нашем сайте:",
            lines: [
              "⏱ Готовим и привозим за 30–40 минут",
              "🕐 Ежедневно с 10:00 до 23:00",
              `🛵 Доставка ${formatPrice(DELIVERY_COST)}, бесплатно от ${formatPrice(FREE_DELIVERY_THRESHOLD)}`,
              "🏪 Самовывоз: Москва, Лесная ул., 5 — 0 ₽",
            ],
          },
        ],
        replies: ["choose", "menu", "telegram"],
      };
    case "telegram":
      return {
        bot: [
          {
            role: "bot",
            kind: "telegram",
            text: "📲 Наш Telegram — бот Shawarma Lab. Там уже принимает заказы вебхук, а полноценный ИИ-помощник подключается следующим этапом.",
          },
        ],
        replies: ["choose", "menu", "delivery"],
      };
  }
}

const GREETING: NewMessage = {
  role: "bot",
  kind: "text",
  text: "👋 Привет! Я виртуальный помощник Shawarma Lab.\nПомогу выбрать блюдо, расскажу о доставке или покажу меню.",
};

const THINKING_MS = 700;

export function AiAssistant() {
  const { hydrated, count, isOpen: cartOpen } = useCart();
  const [open, setOpen] = useState(false);
  // Стартовая реплика одинакова на server и client — без hydration-расхождения.
  const [messages, setMessages] = useState<Message[]>([
    { ...GREETING, id: 0 },
  ]);
  const [replies, setReplies] = useState<ActionId[] | null>(ROOT_REPLIES);
  const [typing, setTyping] = useState(false);

  const idRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return idRef.current;
  }, []);

  const close = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTyping(false);
    setReplies(ROOT_REPLIES);
    setOpen(false);
  }, []);

  // Только очистка незавершённого таймера при размонтировании.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleAction = useCallback(
    (action: ActionId) => {
      if (typing) return;

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", kind: "text", text: ACTIONS[action] },
      ]);
      setReplies(null);
      setTyping(true);

      timerRef.current = setTimeout(() => {
        const { bot, replies: nextReplies } = script(action);
        timerRef.current = null;
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          ...bot.map((m) => ({ ...m, id: nextId() })),
        ]);
        setReplies(nextReplies);
      }, THINKING_MS);
    },
    [nextId, typing],
  );

  // Автоскролл к новым сообщениям.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, replies, open]);

  // Фокус в панель при открытии (для Esc и скринридеров).
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Закрытие по клику вне панели.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!panelRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Поднимаем кнопку над sticky-панелью корзины на мобильных.
  const aboveStickyBar = hydrated && count > 0 && !cartOpen;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть AI-помощника Shawarma Lab"
          className={cn(
            "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-bg shadow-[0_10px_36px_rgba(245,158,11,0.28)] outline-none transition-colors hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:right-6 md:h-12 md:px-5",
            // на мобильных поднимаем над sticky-панелью корзины (она скрыта на md+)
            aboveStickyBar && "max-md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))]",
          )}
        >
          <span aria-hidden>🤖</span>
          Помощник
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Чат с AI-помощником Shawarma Lab"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          className={cn(
            "assistant-panel fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex max-h-[72dvh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.65)] outline-none md:inset-x-auto md:right-6 md:h-[540px] md:max-h-[calc(100dvh-5rem)] md:w-[380px]",
            aboveStickyBar && "max-md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))]",
          )}
        >
          {/* Шапка чата */}
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-elevated/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-base leading-none"
              >
                🤖
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">
                  Помощник Shawarma Lab
                </p>
                <p className="text-[11px] leading-tight text-white/40">
                  Отвечает мгновенно · демонстрация
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть чат"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/50 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
          </header>

          {/* Лента сообщений */}
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
          >
            {messages.map((message) => (
              <Bubble key={message.id} message={message} onClose={close} />
            ))}

            {typing && (
              <div className="assistant-msg flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.06] px-3.5 py-3">
                  <span className="assistant-dot" style={{ animationDelay: "0ms" }} />
                  <span className="assistant-dot" style={{ animationDelay: "150ms" }} />
                  <span className="assistant-dot" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {!typing && replies && replies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1.5">
                {replies.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleAction(action)}
                    className="h-9 rounded-full border border-white/[0.14] bg-white/[0.04] px-3.5 text-[13px] font-semibold text-white/85 outline-none transition-colors hover:border-accent/50 hover:bg-accent/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {ACTIONS[action]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Рендер сообщений                                                    */
/* ------------------------------------------------------------------ */

function Bubble({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="assistant-msg flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-bg">
          {message.text}
        </p>
      </div>
    );
  }

  switch (message.kind) {
    case "text":
      return (
        <div className="assistant-msg flex justify-start">
          <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed">
            {message.text}
          </p>
        </div>
      );

    case "menu":
      return (
        <div className="assistant-msg space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-bold tracking-[0.03em]">
                  {product.name}{" "}
                  {product.badge && (
                    <span
                      className={cn(
                        "ml-2 rounded px-1.5 py-0.5 align-middle text-[9px] font-extrabold uppercase tracking-wider",
                        product.badge.tone === "hot"
                          ? "bg-hot text-white"
                          : "bg-accent text-bg",
                      )}
                    >
                      {product.badge.label}
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-[13px] font-bold tabular-nums text-accent">
                  {formatPrice(product.price)}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {product.description}
              </p>
            </div>
          ))}
          <MenuLink onClose={onClose} />
        </div>
      );

    case "recommend":
      return (
        <div className="assistant-msg space-y-2">
          <div className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-tl-md border border-accent/25 bg-accent/[0.08] px-3.5 py-2.5 text-[13px] leading-relaxed">
              {message.product.name} ·{" "}
              <span className="font-bold tabular-nums text-accent">
                {formatPrice(message.product.price)}
              </span>
              <span className="mt-0.5 block text-xs text-white/55">
                {message.product.description}
              </span>
            </p>
          </div>
          <MenuLink onClose={onClose} />
        </div>
      );

    case "delivery":
      return (
        <div className="assistant-msg flex justify-start">
          <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed">
            <p>{message.intro}</p>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              {message.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-white/35">
              Демонстрационные условия — актуальные всегда в разделе «Доставка».
            </p>
          </div>
        </div>
      );

    case "telegram":
      return (
        <div className="assistant-msg flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed">
            <p>{message.text}</p>
            <a
              href={siteLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-bold text-bg outline-none transition-colors hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Открыть в Telegram
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      );
  }
}

function MenuLink({ onClose }: { onClose: () => void }) {
  return (
    <a
      href="#menu"
      onClick={onClose}
      className="assistant-msg inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.08] px-3.5 text-[13px] font-semibold text-accent outline-none transition-colors hover:bg-accent/[0.15] focus-visible:ring-2 focus-visible:ring-accent"
    >
      🌯 Посмотреть в меню
    </a>
  );
}

"use client";

import { ArrowRight, ShoppingCart } from "lucide-react";

import { formatPrice, formatQuantity } from "@/lib/cart";
import { useCart } from "@/lib/cart-context";

/**
 * Компактная панель корзины внизу экрана на мобильных.
 * Показывается только когда в корзине есть товары
 * и панель заказа закрыта.
 */
export function StickyCartBar() {
  const { hydrated, count, subtotal, openCart, isOpen } = useCart();

  if (!hydrated || count === 0 || isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        onClick={openCart}
        aria-label={`Открыть корзину: ${formatQuantity(count)} на ${formatPrice(subtotal)}`}
        className="flex w-full items-center justify-between gap-4 rounded-2xl bg-accent px-5 py-4 text-bg shadow-[0_10px_40px_rgba(245,158,11,0.25)] outline-none transition-colors hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold">
          <ShoppingCart className="size-[18px]" aria-hidden />
          {formatQuantity(count)}
        </span>
        <span className="flex items-center gap-2 text-sm font-bold tabular-nums">
          {formatPrice(subtotal)}
          <span aria-hidden className="flex items-center gap-1">
            Корзина
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </span>
      </button>
    </div>
  );
}

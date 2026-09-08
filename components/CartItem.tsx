"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";

import { formatPrice, type CartLine } from "@/lib/cart";
import { useCart } from "@/lib/cart-context";

export function CartItem({ line }: { line: CartLine }) {
  const { setItemQuantity, removeItem } = useCart();
  const { product, quantity, lineTotal } = line;

  return (
    <li className="flex gap-4 py-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.07]">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-bold tracking-[0.03em]">
            {product.name}
          </h3>
          <button
            type="button"
            onClick={() => removeItem(product.id)}
            aria-label={`Удалить ${product.name} из корзины`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition-colors outline-none hover:bg-white/[0.06] hover:text-hot focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>

        <p className="mt-0.5 text-sm tabular-nums text-white/45">
          {formatPrice(product.price)}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setItemQuantity(product.id, quantity - 1)}
              aria-label={`Уменьшить количество ${product.name}`}
              className="flex h-full w-9 items-center justify-center rounded-l-lg text-white/65 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span
              className="w-9 text-center text-sm font-semibold tabular-nums"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setItemQuantity(product.id, quantity + 1)}
              aria-label={`Увеличить количество ${product.name}`}
              className="flex h-full w-9 items-center justify-center rounded-r-lg text-white/65 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>

          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </li>
  );
}

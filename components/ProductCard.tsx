"use client";

import Image from "next/image";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/data/products";
import { formatPrice } from "@/lib/cart";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, quantityOf, hydrated } = useCart();
  const quantity = hydrated ? quantityOf(product.id) : 0;
  const inCart = quantity > 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-surface transition-colors duration-300 hover:border-white/[0.16]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(min-width: 768px) 32vw, 100vw"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {product.badge && (
          <span
            className={cn(
              "absolute left-4 top-4 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]",
              product.badge.tone === "hot"
                ? "bg-hot text-white"
                : "bg-accent text-bg",
            )}
          >
            {product.badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 className="text-base font-bold tracking-[0.04em] md:text-[17px]">
          {product.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {product.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          <span className="text-lg font-bold tabular-nums">
            {formatPrice(product.price)}
          </span>

          <Button
            variant={inCart ? "secondary" : "default"}
            onClick={() => addItem(product.id)}
            aria-label={
              inCart
                ? `${product.name}: ${quantity} в корзине. Добавить ещё одну`
                : `Добавить ${product.name} в корзину`
            }
          >
            {inCart ? (
              <>
                <Check className="size-4 text-accent" aria-hidden />
                <span aria-live="polite">В корзине</span>
                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-bg">
                  {quantity}
                </span>
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
                Добавить
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

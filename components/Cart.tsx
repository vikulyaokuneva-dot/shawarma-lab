"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";

import { CartItem } from "@/components/CartItem";
import { Checkout } from "@/components/Checkout";
import { OrderSuccess } from "@/components/OrderSuccess";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DELIVERY_COST,
  FREE_DELIVERY_THRESHOLD,
  formatPrice,
  formatQuantity,
  getDeliveryCost,
  getRemainingForFreeDelivery,
} from "@/lib/cart";
import { useCart } from "@/lib/cart-context";
import type { PlacedOrder } from "@/services/orderService";
import { cn } from "@/lib/utils";

type Step = "cart" | "checkout" | "success";

const stepMeta: Record<Step, { title: string; description: string }> = {
  cart: {
    title: "Ваш заказ",
    description: "Товары в корзине. Количество можно изменить на месте.",
  },
  checkout: {
    title: "Куда доставить?",
    description: "Укажите контакты — мы позвоним для подтверждения.",
  },
  success: {
    title: "Готово",
    description: "Заказ передан на кухню.",
  },
};

export function Cart() {
  const cart = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  // При каждом открытии начинаем с шага «корзина».
  useEffect(() => {
    if (cart.isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("cart");
      setOrder(null);
    }
  }, [cart.isOpen]);

  const deliveryCost = getDeliveryCost(cart.subtotal, "delivery");
  const total = cart.subtotal + deliveryCost;
  const remaining = getRemainingForFreeDelivery(cart.subtotal);
  const progress = Math.min(100, (cart.subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const meta = stepMeta[step];

  return (
    <Sheet
      open={cart.isOpen}
      onOpenChange={(open) => (open ? cart.openCart() : cart.closeCart())}
    >
      <SheetContent className="overflow-hidden">
        <SheetHeader>
          {step === "checkout" && (
            <button
              type="button"
              onClick={() => setStep("cart")}
              aria-label="Назад к корзине"
              className="-ml-2 flex size-9 items-center justify-center rounded-lg text-white/60 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <div>
            <SheetTitle>{meta.title}</SheetTitle>
            <SheetDescription className="mt-1 text-xs">
              {step === "cart" && cart.count > 0
                ? `${formatQuantity(cart.count)} · ${formatPrice(cart.subtotal)}`
                : meta.description}
            </SheetDescription>
          </div>
        </SheetHeader>

        {step === "cart" && cart.count === 0 && (
          <SheetBody className="items-center justify-center gap-5 px-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <ShoppingCart className="size-7 text-white/40" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-semibold">Корзина пока пустая</p>
              <p className="mt-1 text-sm text-white/50">
                Но это легко исправить.
              </p>
            </div>
            <a
              href="#menu"
              onClick={cart.closeCart}
              className={cn(buttonVariants(), "mt-2")}
            >
              Перейти к меню
            </a>
          </SheetBody>
        )}

        {step === "cart" && cart.count > 0 && (
          <>
            <SheetBody className="overflow-y-auto px-6">
              <ul className="divide-y divide-white/[0.05]">
                {cart.lines.map((line) => (
                  <CartItem key={line.product.id} line={line} />
                ))}
              </ul>

              {/* Полоса до бесплатной доставки */}
              <div className="mb-4 mt-2 rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
                {remaining > 0 ? (
                  <>
                    <p className="text-sm text-white/75">
                      До бесплатной доставки:{" "}
                      <span className="font-bold text-accent tabular-nums">
                        {formatPrice(remaining)}
                      </span>
                    </p>
                    <div
                      className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={FREE_DELIVERY_THRESHOLD}
                      aria-valuenow={cart.subtotal}
                      aria-label="Прогресс до бесплатной доставки"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${Math.max(4, progress)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                    <Check className="size-4" aria-hidden />
                    Бесплатная доставка
                  </p>
                )}
              </div>
            </SheetBody>

            <SheetFooter>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-white/55">
                  <dt>Товары</dt>
                  <dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-white/55">
                  <dt>Доставка</dt>
                  <dd className={cn("tabular-nums", deliveryCost === 0 && "text-accent")}>
                    {deliveryCost === 0
                      ? "0 ₽"
                      : formatPrice(DELIVERY_COST)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-white/[0.07] pt-3 text-base font-bold">
                  <dt>Итого</dt>
                  <dd className="tabular-nums">{formatPrice(total)}</dd>
                </div>
              </dl>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={() => setStep("checkout")}
              >
                Оформить заказ
              </Button>
            </SheetFooter>
          </>
        )}

        {step === "checkout" && (
          <Checkout onBack={() => setStep("cart")} onPlaced={(placed) => {
            setOrder(placed);
            setStep("success");
          }} />
        )}

        {step === "success" && order && (
          <OrderSuccess
            order={order}
            onBackToMenu={() => {
              cart.closeCart();
              window.location.hash = "#menu";
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

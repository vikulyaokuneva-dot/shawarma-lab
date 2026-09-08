import { Check, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";
import type { PlacedOrder } from "@/services/orderService";

export function OrderSuccess({
  order,
  onBackToMenu,
}: {
  order: PlacedOrder;
  onBackToMenu: () => void;
}) {
  const isPickup = order.method === "pickup";

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
        <Check className="size-7 text-accent" aria-hidden />
      </div>

      <h3 className="anim anim-d1 mt-6 text-2xl font-bold tracking-tight">
        Заказ принят 🔥
      </h3>

      <p className="anim anim-d2 mt-3 inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-accent">
        №{order.number}
      </p>

      <p className="anim anim-d3 mt-4 max-w-[34ch] text-sm leading-relaxed text-white/60">
        Мы уже передали заказ на кухню.
      </p>

      <div className="anim anim-d4 mt-8 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-white/40">
          Ориентировочное время
        </p>
        <p className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
          <Clock className="size-4 text-accent" aria-hidden />
          {isPickup ? "15–20 минут" : "30–40 минут"}
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/45">
          <MapPin className="size-3.5" aria-hidden />
          {isPickup
            ? "Самовывоз: Москва, Лесная ул., 5"
            : `Доставка: ${order.customer.address ?? "адрес уточнён с оператором"}`}
        </p>
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-sm tabular-nums text-white/60">
          Оплатите при получении — {formatPrice(order.total)}
        </p>
      </div>

      <Button size="lg" onClick={onBackToMenu} className="mt-9 w-full max-w-[260px]">
        Вернуться в меню
      </Button>
    </div>
  );
}

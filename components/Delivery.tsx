import { ArrowRight, Banknote, Clock, MapPin, Truck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DELIVERY_COST,
  FREE_DELIVERY_THRESHOLD,
  formatPrice,
} from "@/lib/cart";

const points = [
  {
    Icon: Clock,
    text: "Ежедневно с 10:00 до 23:00",
  },
  {
    Icon: Banknote,
    text: "Оплата картой или наличными при получении",
  },
  {
    Icon: Truck,
    text: `Бесплатная доставка при заказе от ${formatPrice(FREE_DELIVERY_THRESHOLD)}`,
  },
  {
    Icon: MapPin,
    text: "Самовывоз: Москва, Лесная ул., 5",
  },
];

export function Delivery() {
  return (
    <section id="delivery" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-10 rounded-3xl border border-white/[0.07] bg-surface p-7 md:p-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
              <span aria-hidden className="h-px w-8 bg-accent/60" />
              Доставка
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Горячая доставка
              <br className="hidden md:block" /> от 30 минут
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
              Привозим по всей Москве. Сумма доставки —{" "}
              {formatPrice(DELIVERY_COST)}, а при заказе от{" "}
              {formatPrice(FREE_DELIVERY_THRESHOLD)} мы везём бесплатно.
              Забрать самовывозом — всегда 0&nbsp;₽.
            </p>
            <a
              href="#menu"
              className={buttonVariants({ size: "lg", className: "mt-8" })}
            >
              Заказать сейчас
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>

          <ul className="space-y-3">
            {points.map(({ Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5"
              >
                <Icon className="size-4 shrink-0 text-accent" aria-hidden />
                <span className="text-sm text-white/75">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

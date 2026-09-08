import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/cart";

const minPrice = Math.min(...products.map((p) => p.price));

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Статичное тёплое свечение — без анимаций */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-[-12%] size-[560px] rounded-full bg-accent/[0.07] blur-[130px]"
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:py-16 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24">
        <div>
          <p className="anim anim-d1 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <span aria-hidden className="h-px w-8 bg-accent/60" />
            Street food / Москва
          </p>

          <h1 className="anim anim-d2 mt-5 max-w-[620px] text-[40px] font-bold leading-[1.06] tracking-tight sm:text-6xl lg:text-[66px]">
            Шаурма, которую хочется{" "}
            <span className="text-accent">повторить.</span>
          </h1>

          <p className="anim anim-d3 mt-6 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
            Сочная начинка, хрустящий лаваш и соусы собственного приготовления.
          </p>

          <div className="anim anim-d4 mt-9 flex flex-wrap items-center gap-3">
            <a href="#menu" className={buttonVariants({ size: "lg" })}>
              Заказать сейчас
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#menu"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Смотреть меню
            </a>
          </div>

          <p className="anim anim-d5 mt-9 text-[13px] text-white/35">
            {products.length} позиции меню · от {formatPrice(minPrice)} ·
            доставка 30–40 минут
          </p>
        </div>

        <div className="anim-img relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08] sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src="/images/hero-shawarma.jpg"
              alt="Свежеприготовленная шаурма в хрустящем лаваше с курицей на гриле, овощами и соусом на тёмном фоне"
              fill
              priority
              sizes="(min-width: 1024px) 42vw, (min-width: 640px) 60vw, 100vw"
              className="object-cover"
            />
            {/* Мягкий градиент, чтобы картинка сливалась с фоном */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-bg/55 via-transparent to-transparent"
            />
          </div>

          <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
            <Flame className="size-5 text-accent" aria-hidden />
            <div>
              <p className="text-[11px] leading-tight text-white/50">
                Готовим при вас
              </p>
              <p className="text-sm font-semibold leading-tight">
                30–40 минут
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

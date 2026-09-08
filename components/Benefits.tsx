import { ChefHat, Flame, Truck } from "lucide-react";

const benefits = [
  {
    number: "01",
    title: "Мясо с гриля",
    description: "Готовим непосредственно перед заказом.",
    Icon: Flame,
  },
  {
    number: "02",
    title: "Соусы собственного приготовления",
    description: "Никаких готовых соусов из бутылки.",
    Icon: ChefHat,
  },
  {
    number: "03",
    title: "Доставка от 30 минут",
    description: "Горячая шаурма приезжает прямо к вам.",
    Icon: Truck,
  },
];

export function Benefits() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-t border-white/[0.05] py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
          <span aria-hidden className="h-px w-8 bg-accent/60" />
          О нас
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
          Почему Shawarma Lab
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {benefits.map(({ number, title, description, Icon }) => (
            <div
              key={number}
              className="rounded-2xl border border-white/[0.07] bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-accent/10 p-2 text-accent">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="text-xs font-bold tracking-widest text-white/25">
                  {number}
                </span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold leading-snug">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    title: "Выбираешь",
    description: "Выбираешь шаурму в меню.",
  },
  {
    number: "02",
    title: "Заказываешь",
    description: "Добавляешь в корзину и оформляешь заказ.",
  },
  {
    number: "03",
    title: "Получаешь",
    description: "Мы готовим и отправляем заказ.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-white/[0.05] py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
          <span aria-hidden className="h-px w-8 bg-accent/60" />
          Просто
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
          Как это работает
        </h2>

        <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Соединительная линия на desktop */}
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-[22px] hidden h-px bg-gradient-to-r from-white/[0.04] via-white/15 to-white/[0.04] md:block"
          />

          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex size-11 items-center justify-center rounded-full border border-accent/40 bg-bg text-[13px] font-bold tabular-nums text-accent">
                {step.number}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-white/55">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

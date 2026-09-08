import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

export function Menu() {
  return (
    <section id="menu" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
          <span aria-hidden className="h-px w-8 bg-accent/60" />
          Меню
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Выбери свою
        </h2>
        <p className="mt-3 text-base text-white/55 md:text-lg">
          Три варианта. Ноль компромиссов.
        </p>

        <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-3 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

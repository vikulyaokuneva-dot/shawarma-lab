import { Send } from "lucide-react";

const navColumns = [
  {
    heading: "Навигация",
    links: [
      { href: "#menu", label: "Меню" },
      { href: "#about", label: "О нас" },
      { href: "#delivery", label: "Доставка" },
    ],
  },
  {
    heading: "Контакты",
    links: [
      { href: "tel:+74951234567", label: "+7 (495) 123-45-67" },
      { href: "mailto:hello@shawarmalab.ru", label: "hello@shawarmalab.ru" },
      { href: "#delivery", label: "Москва, Лесная ул., 5" },
    ],
  },
  {
    heading: "Мы на связи",
    links: [
      { href: "https://t.me/shawarmalab", label: "Telegram", external: true },
      { href: "https://vk.com/shawarmalab", label: "VK", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a
              href="#top"
              aria-label="Shawarma Lab — наверх"
              className="inline-flex items-center gap-2 rounded-md text-[15px] font-extrabold tracking-[0.18em] outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Send className="size-4 text-accent" aria-hidden />
              SHAWARMA<span className="-ml-2 text-accent">LAB</span>
            </a>
            <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-white/45">
              Шаурма, которую хочется повторить.
            </p>
          </div>

          {navColumns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="rounded text-sm text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/35">
          <p>© 2026 Shawarma Lab</p>
          <p>Демонстрационный frontend-прототип</p>
        </div>
      </div>
    </footer>
  );
}

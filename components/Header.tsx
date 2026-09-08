"use client";

import { useState } from "react";
import { Menu as MenuIcon, ShoppingCart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#menu", label: "Меню" },
  { href: "#about", label: "О нас" },
  { href: "#delivery", label: "Доставка" },
];

function Logo() {
  return (
    <a
      href="#top"
      className="rounded-md text-[15px] font-extrabold tracking-[0.18em] text-white outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="Shawarma Lab — на главную"
    >
      SHAWARMA<span className="text-accent">LAB</span>
    </a>
  );
}

export function Header() {
  const { count, hydrated, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const badgeVisible = hydrated && count > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Logo />

        {/* Центр — desktop-навигация */}
        <nav
          aria-label="Основная навигация"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md text-sm text-white/65 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openCart}
            aria-label={
              badgeVisible
                ? `Открыть корзину: ${count} шт. в корзине`
                : "Открыть корзину: корзина пуста"
            }
          >
            <ShoppingCart className="size-5" aria-hidden />
            {badgeVisible && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold tabular-nums text-bg">
                {count}
              </span>
            )}
          </Button>

          {/* Мобильное меню */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(mobileOpen && "bg-white/[0.06] text-white md:hidden", "md:hidden")}
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Закрыть меню навигации" : "Открыть меню навигации"}
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <MenuIcon className="size-5" aria-hidden />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <nav
            id="mobile-nav"
            aria-label="Мобильная навигация"
            className="absolute inset-x-0 top-16 z-40 border-b border-white/10 bg-bg px-4 pb-4 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-3.5 text-[15px] font-medium text-white/80 outline-none transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}

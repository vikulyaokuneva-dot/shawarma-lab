import type { Metadata, Viewport } from "next";

import "@fontsource-variable/inter";
import "./globals.css";

import { Cart } from "@/components/Cart";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyCartBar } from "@/components/StickyCartBar";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: "Shawarma Lab — современная шаурма с доставкой",
  description:
    "Заказывайте свежую шаурму с доставкой. Курица, говядина, сыр и фирменные соусы.",
  applicationName: "Shawarma Lab",
  keywords: [
    "шаурма",
    "доставка шаурмы",
    "street food",
    "шаурмичная Москва",
    "Shawarma Lab",
  ],
  openGraph: {
    title: "Shawarma Lab — современная шаурма с доставкой",
    description:
      "Заказывайте свежую шаурму с доставкой. Курица, говядина, сыр и фирменные соусы.",
    locale: "ru_RU",
    type: "website",
    siteName: "Shawarma Lab",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-bg text-white antialiased">
        <CartProvider>
          <a
            href="#menu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
          >
            Перейти к меню
          </a>
          <Header />
          {/* pb-28 — место под sticky-панель корзины на мобильных */}
          <div className="pb-28 md:pb-0">
            <main>{children}</main>
            <Footer />
          </div>
          <Cart />
          <StickyCartBar />
        </CartProvider>
      </body>
    </html>
  );
}

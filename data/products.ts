/**
 * Единственный источник данных о товарах.
 * Цены больше нигде не дублируются — все расчёты корзины идут отсюда.
 *
 * Чтобы подставить реальные фотографии, замените файлы по путям `image`
 * в /public/images (см. /public/images/README.md). Формат и имена — те же.
 */

export type ProductBadge = {
  label: string;
  tone: "accent" | "hot";
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  badge: ProductBadge | null;
};

export const products: Product[] = [
  {
    id: "classic-chicken",
    name: "CLASSIC CHICKEN",
    description:
      "Курица на гриле, свежие овощи, хрустящий салат и фирменный чесночный соус.",
    price: 390,
    image: "/images/classic-chicken.jpg",
    imageAlt:
      "Шаурма Classic Chicken: курица на гриле, свежие овощи и чесночный соус в хрустящем лаваше",
    badge: null,
  },
  {
    id: "spicy-beef",
    name: "SPICY BEEF",
    description:
      "Пряная говядина, маринованный лук, томаты, зелень и острый соус.",
    price: 490,
    image: "/images/spicy-beef.jpg",
    imageAlt:
      "Шаурма Spicy Beef: пряная говядина с маринованным луком, томатами и острым соусом",
    badge: { label: "Острая", tone: "hot" },
  },
  {
    id: "cheese-chicken",
    name: "CHEESE CHICKEN",
    description:
      "Курица, расплавленный сыр, свежие овощи и сливочно-чесночный соус.",
    price: 450,
    image: "/images/cheese-chicken.jpg",
    imageAlt:
      "Шаурма Cheese Chicken: курица с расплавленным сыром, свежими овощами и сливочно-чесночным соусом",
    badge: { label: "Хит", tone: "accent" },
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

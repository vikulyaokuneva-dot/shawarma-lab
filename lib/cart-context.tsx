"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clampQuantity,
  getLines,
  getSubtotal,
  loadCart,
  saveCart,
  type CartItem,
  type CartLine,
} from "@/lib/cart";

type CartContextValue = {
  /** false до гидрации из localStorage — UI скрывает счётчики. */
  hydrated: boolean;
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (productId: string, quantity?: number) => void;
  setItemQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  quantityOf: (productId: string) => number;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Гидрация из localStorage выполняется только на клиенте —
  // синхронизация внешнего состояния, каноничный случай setState в эффекте.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadCart());
     
    setHydrated(true);
  }, []);

  // Сохраняем корзину после каждой изменения (и после гидрации).
  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: clampQuantity(item.quantity + quantity),
              }
            : item,
        );
      }
      const clamped = clampQuantity(quantity);
      return clamped > 0 ? [...prev, { productId, quantity: clamped }] : prev;
    });
  }, []);

  const setItemQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.productId !== productId)
        : prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: clampQuantity(quantity) }
              : item,
          ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const lines = useMemo(() => getLines(items), [items]);
  const subtotal = useMemo(() => getSubtotal(lines), [lines]);
  const count = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );
  const quantityOf = useCallback(
    (productId: string) =>
      items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items],
  );

  const value = useMemo(
    () => ({
      hydrated,
      items,
      lines,
      count,
      subtotal,
      isOpen,
      addItem,
      setItemQuantity,
      removeItem,
      clearCart,
      quantityOf,
      openCart,
      closeCart,
    }),
    [
      hydrated,
      items,
      lines,
      count,
      subtotal,
      isOpen,
      addItem,
      setItemQuantity,
      removeItem,
      clearCart,
      quantityOf,
      openCart,
      closeCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return context;
}

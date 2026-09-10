"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, MapPin, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DELIVERY_COST,
  FREE_DELIVERY_THRESHOLD,
  formatPhoneInput,
  formatPrice,
  getDeliveryCost,
  normalizePhone,
  type DeliveryMethod,
} from "@/lib/cart";
import { useCart } from "@/lib/cart-context";
import { submitOrder, type PlacedOrder } from "@/services/orderService";
import { cn } from "@/lib/utils";

/** Все поля формы всегда строки; опциональность разводится при отправке. */
type CheckoutForm = {
  name: string;
  phone: string;
  address: string;
  apartment: string;
  comment: string;
};

type FieldErrors = Partial<Record<keyof CheckoutForm, string>>;

const emptyForm: CheckoutForm = {
  name: "",
  phone: "",
  address: "",
  apartment: "",
  comment: "",
};

export function Checkout({
  onBack,
  onPlaced,
}: {
  onBack: () => void;
  onPlaced: (order: PlacedOrder) => void;
}) {
  const cart = useCart();
  const [method, setMethod] = useState<DeliveryMethod>("delivery");
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const deliveryCost = getDeliveryCost(cart.subtotal, method);
  const total = cart.subtotal + deliveryCost;

  const setField = (field: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) {
      next.name = "Укажите имя — минимум 2 символа";
    }
    const digits = normalizePhone(form.phone);
    if (!/^7\d{10}$/.test(digits)) {
      next.phone = "Укажите телефон в формате +7 (999) 123-45-67";
    }
    if (method === "delivery" && form.address.trim().length < 5) {
      next.address = "Укажите адрес доставки — улица и дом";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await submitOrder({
        lines: cart.lines,
        customer: {
          name: form.name.trim(),
          phone: normalizePhone(form.phone),
          ...(method === "delivery"
            ? {
                address: form.address.trim(),
                apartment: form.apartment.trim() || undefined,
              }
            : {}),
          comment: form.comment.trim() || undefined,
        },
        method,
        subtotal: cart.subtotal,
        deliveryCost,
      });
      cart.clearCart();
      onPlaced(order);
    } catch (error) {
      // orderService гарантирует человекочитающее RU-сообщение без секретов;
      // корзина и введённые данные сохраняются — можно повторить отправку.
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Не удалось отправить заказ. Попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Способ получения */}
        <fieldset>
          <legend className="text-sm font-medium text-white/70">
            Способ получения
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MethodOption
              checked={method === "delivery"}
              onChange={() => setMethod("delivery")}
              icon={<Truck className="size-5" aria-hidden />}
              title="Доставка"
              subtitle={`${formatPrice(DELIVERY_COST)} · от ${formatPrice(FREE_DELIVERY_THRESHOLD)} бесплатно`}
            />
            <MethodOption
              checked={method === "pickup"}
              onChange={() => setMethod("pickup")}
              icon={<Store className="size-5" aria-hidden />}
              title="Самовывоз"
              subtitle="Лесная ул., 5 · 0 ₽"
            />
          </div>
        </fieldset>

        <div className="mt-6 space-y-5">
          <FormField label="Имя" id="checkout-name" error={errors.name}>
            <Input
              id="checkout-name"
              name="name"
              autoComplete="name"
              placeholder="Александр"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
          </FormField>

          <FormField label="Телефон" id="checkout-phone" error={errors.phone}>
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (___) ___-__-__"
              value={form.phone}
              onChange={(e) => setField("phone", formatPhoneInput(e.target.value))}
              aria-invalid={errors.phone ? true : undefined}
            />
          </FormField>

          {method === "delivery" && (
            <>
              <FormField label="Адрес" id="checkout-address" error={errors.address}>
                <Input
                  id="checkout-address"
                  name="address"
                  autoComplete="street-address"
                  placeholder="ул. Лесная, 5"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  aria-invalid={errors.address ? true : undefined}
                />
              </FormField>

              <FormField
                label="Квартира / офис"
                id="checkout-apartment"
                optional
              >
                <Input
                  id="checkout-apartment"
                  name="apartment"
                  placeholder="Кв. 12, этаж 3"
                  value={form.apartment}
                  onChange={(e) => setField("apartment", e.target.value)}
                />
              </FormField>
            </>
          )}

          {method === "pickup" && (
            <p className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-sm leading-relaxed text-white/60">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              Заберёте на точке: Москва, Лесная ул., 5. Доставка не нужна —
              платите только за шаурму.
            </p>
          )}

          <FormField label="Комментарий" id="checkout-comment" optional>
            <Textarea
              id="checkout-comment"
              name="comment"
              placeholder="Домофон, этаж, позвонить за 5 минут…"
              value={form.comment}
              onChange={(e) => setField("comment", e.target.value)}
            />
          </FormField>

          {/* Итог по заказу */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-sm">
            <div className="flex justify-between text-white/55">
              <span>Товары</span>
              <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-white/55">
              <span>Доставка</span>
              <span className={cn("tabular-nums", deliveryCost === 0 && "text-accent")}>
                {deliveryCost === 0 ? "0 ₽" : formatPrice(DELIVERY_COST)}
              </span>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/[0.07] pt-3 font-semibold">
              <span>Итого</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {submitError && (
          <p role="alert" className="mb-3 text-xs text-hot">
            {submitError}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="shrink-0 px-4"
            aria-label="Назад к корзине"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Назад
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || cart.count === 0}
            className="flex-1"
          >
            {submitting
              ? "Отправляем…"
              : `Подтвердить заказ — ${formatPrice(total)}`}
          </Button>
        </div>
      </div>
    </form>
  );
}

function MethodOption({
  checked,
  onChange,
  icon,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name="method"
        value={title}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex flex-col items-center gap-1 rounded-xl border bg-white/[0.02] px-3 py-4 text-center transition-colors outline-none",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface",
          checked
            ? "border-accent/60 bg-accent/[0.07] text-white"
            : "border-white/10 text-white/80 hover:border-white/25",
        )}
      >
        <span className={cn(checked ? "text-accent" : "text-white/50")}>
          {icon}
        </span>
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs leading-snug text-white/40">{subtitle}</span>
      </span>
    </label>
  );
}

function FormField({
  label,
  id,
  error,
  optional,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional && (
          <span className="text-xs text-white/30">необязательно</span>
        )}
      </div>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-hot" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";

import { parseSiteOrder } from "@/lib/server/order";
import { formatAdminOrder } from "@/lib/telegram/adminOrder";
import { createTelegramClient } from "@/lib/telegram/client";
import { nextOrderNumber } from "@/lib/telegram/store";

/**
 * Заказ с сайта: POST /api/orders → серверная валидация (lib/server/order.ts)
 * → заявка владельцу через существующий Telegram-клиент (тот же
 * createTelegramClient, тот же формат, что у бота; «📲 Источник: Сайт»).
 *
 * Ответ всегда без секретов и stack trace: только machine-readable код ошибки,
 * который orderService переводит в понятное человеку сообщение.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const parsed = parseSiteOrder(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: "validation", detail: parsed.error },
        { status: 400 },
      );
    }
    const order = parsed.order;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !adminChatId) {
      console.error("Order API: Telegram delivery is not configured");
      return NextResponse.json(
        { ok: false, error: "not-configured" },
        { status: 503 },
      );
    }

    // Общая демо-нумерация с ботом: тот же счётчик nextOrderNumber() из
    // lib/telegram/store.ts (в Telegram-заявках номера не ломаются).
    const orderNumber = nextOrderNumber();
    const client = createTelegramClient(token);
    const delivered = await client.sendMessage(
      adminChatId,
      formatAdminOrder({
        orderNumber,
        lines: order.lines,
        subtotal: order.subtotal,
        deliveryCost: order.deliveryCost,
        method: order.method,
        customerName: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
        // На сайте способа оплаты нет: честно — «при получении».
        paymentLabel: "при получении",
        source: "Сайт",
      }),
    );

    if (!delivered) {
      return NextResponse.json(
        { ok: false, error: "telegram-unavailable" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      number: `SL-${orderNumber}`,
      createdAt: new Date().toISOString(),
      subtotal: order.subtotal,
      deliveryCost: order.deliveryCost,
      total: order.total,
    });
  } catch (error) {
    // Никаких деталей наружу; в лог — только класс ошибки (без секретов).
    console.error(
      "Order API error:",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { ok: false, error: "internal" },
      { status: 500 },
    );
  }
}

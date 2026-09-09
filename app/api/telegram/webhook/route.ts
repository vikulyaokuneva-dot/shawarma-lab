import { NextRequest, NextResponse } from "next/server";

import { createTelegramClient } from "@/lib/telegram/client";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/scenario";

/**
 * Telegram webhook Shawarma Lab (тот же путь и каркас, что в исходной
 * заглушке). Транспорт остаётся здесь, сценарий заказа — в
 * lib/telegram/scenario.ts; идемпотентность update_id и состояние диалога —
 * в lib/telegram/store.ts.
 *
 * Переменные окружения (Vercel):
 *   TELEGRAM_BOT_TOKEN      — токен бота (уже настроен);
 *   TELEGRAM_ADMIN_CHAT_ID  — chat ID владельца-получателя заявок (новый).
 * Без админского chat ID заказы честно НЕ принимаются (см. confirmOrder).
 */
export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as TgUpdate;

    const chatId =
      update?.message?.chat?.id ?? update?.callback_query?.from?.id;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not configured");
      return NextResponse.json(
        { error: "Telegram token is not configured" },
        { status: 500 },
      );
    }

    await handleUpdate(update, {
      client: createTelegramClient(token),
      adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

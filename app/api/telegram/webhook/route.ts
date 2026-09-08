import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not configured");
      return NextResponse.json(
        { error: "Telegram token is not configured" },
        { status: 500 }
      );
    }

    const reply = text
      ? `Привет! 🌯 Ты написал: ${text}\n\nЯ AI-помощник Shawarma Lab. Скоро я смогу помочь тебе выбрать шаурму.`
      : "Привет! 🌯 Я AI-помощник Shawarma Lab.";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
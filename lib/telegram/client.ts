/**
 * Тонкий клиент Telegram Bot API — переиспользует тот же способ отправки,
 * что и исходный webhook (fetch к api.telegram.org), ничего не логирует
 * из секретов: токен используется только внутри URL запроса.
 */

export type InlineKeyboardButton = { text: string; callback_data: string };
export type InlineKeyboard = { inline_keyboard: InlineKeyboardButton[][] };

const API = "https://api.telegram.org";

async function callApi(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Telegram API ${method} failed: HTTP ${response.status}`);
      return false;
    }
    const data: unknown = await response.json();
    const ok =
      typeof data === "object" &&
      data !== null &&
      (data as { ok?: unknown }).ok === true;
    if (!ok) console.error(`Telegram API ${method}: ok=false`);
    return ok;
  } catch (error) {
    // Логируем только класс/сообщение ошибки: URL запроса содержит токен,
    // и сетевые ошибки теоретически могут его процитировать.
    const safe = error instanceof Error ? error.name : "unknown";
    console.error(`Telegram API ${method} error: ${safe}`);
    return false;
  }
}

export function createTelegramClient(token: string) {
  return {
    /** Отправляет сообщение; false — доставка не подтверждена API. */
    sendMessage(
      chatId: number | string,
      text: string,
      keyboard?: InlineKeyboard,
    ): Promise<boolean> {
      return callApi(token, "sendMessage", {
        chat_id: chatId,
        text,
        ...(keyboard ? { reply_markup: keyboard } : {}),
      });
    },

    /** Гасит «часики» на нажатой inline-кнопке. */
    answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
      return callApi(token, "answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      });
    },
  };
}

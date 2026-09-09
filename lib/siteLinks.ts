/**
 * Единый источник внешних ссылок проекта.
 * Telegram-бот один (webhook уже в app/api/telegram/webhook/route.ts) —
 * все места сайта (футер, AI-ассистент) берут ссылку отсюда.
 */
export const siteLinks = {
  telegram: "https://t.me/shawarmalab",
  vk: "https://vk.com/shawarmalab",
} as const;

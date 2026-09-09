# Shawarma Lab — Shawarma Lab

> **Шаурма, которую хочется повторить.**

Рабочий frontend-прототип интернет-магазина современной шаурмичной. Это не
лендинг: каталог, корзина и оформление заказа реально работают. Следующий
этап — подключение ИИ-консультанта и Telegram-бота (архитектура под это
уже заложена, см. ниже).

## Стек

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (токены темы в `app/globals.css`)
- shadcn-подход: компоненты `components/ui/*` на Radix Dialog + CVA
- Lucide Icons
- Без внешних image-URL: все файлы лежат в `public/images`

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # продакшн-сборка
npm run start    # продакшн-сервер
npm run lint     # ESLint
```

Демо-инструменты:

```bash
node scripts/cart-logic.test.mjs   # прогон чистой логики корзины против реальных исходников
node scripts/generate-images.mjs   # перегенерация изображений-плейсхолдеров
node scripts/check-images.mjs <файлы…>  # статистики яркости/цвета изображений (QA без браузера)
```

## Структура

```
app/                    # макет (SEO-метаданные, шрифты), страница, иконка
components/
  Header.tsx            # sticky-хедер: логотип, навигация, корзина со счётчиком, моб. меню
  Hero.tsx              # первый экран + умеренные entrance-анимации
  Menu.tsx              # секция «Выбери свою»
  ProductCard.tsx       # карточка: + Добавить → ✓ В корзине (кол-во)
  Benefits.tsx          # «Почему Shawarma Lab»
  HowItWorks.tsx        # 01 Выбираешь → 02 Заказываешь → 03 Получаешь
  Delivery.tsx          # секция доставки (порог бесплатной доставки)
  Footer.tsx
  Cart.tsx              # Sheet-панель «Ваш заказ» (шаги: корзина → checkout → успех)
  CartItem.tsx          # строка: фото, название, цена, [-] N [+], удалить
  Checkout.tsx          # «Куда доставить?»: имя/телефон/адрес/кв/комментарий + доставка/самовывоз
  OrderSuccess.tsx      # «Заказ принят 🔥 №SL-xxxx»
  StickyCartBar.tsx     # мобильная sticky-панель корзины внизу
  AiAssistant.tsx       # плавающий AI-помощник: сценарные демо-ответы, без внешнего AI-API
  ui/                   # button, sheet, input, label, textarea (в стиле shadcn/ui)
data/products.ts        # ЕДИНСТВЕННЫЙ источник товаров и цен
lib/siteLinks.ts        # единые внешние ссылки (Telegram/VK) — футер и ассистент
services/orderService.ts# submitOrder(): mock-сохранение заказа; здесь подключается Telegram
lib/cart.ts             # чистые функции: localStorage, расчёты, форматирование
lib/cart-context.tsx    # CartProvider (React Context + localStorage-персист)
public/images/          # изображения (README внутри — как заменить на реальные фото)
```

## Как работает корзина

- Состояние — `CartProvider`; персист — `localStorage`
  (`shawarma-lab:cart:v1`), переживает перезагрузку страницы.
- Все суммы считаются от `data/products.ts`; цены больше нигде не дублируются.
- Доставка: `199 ₽`, бесплатно от `1 500 ₽`, самовывоз — всегда `0 ₽`.
  Полоса прогресса «До бесплатной доставки: N ₽» обновляется динамически.
- Checkout валидируется на клиенте (имя, маска телефона, адрес при доставке).

## Telegram-бот: демо-сценарий заказа

Вебхук `POST /api/telegram/webhook` → чистый движок сценария
(`lib/telegram/scenario.ts`) с инъекцией транспорта (`lib/telegram/client.ts`).
Поток: `/start` → «Помочь выбрать» / «Меню» / «Доставка» / «Сделать заказ» →
выбор товара и количества → корзина (счёты из `lib/cart.ts`, товары из
`data/products.ts`) → имя/телефон/адрес (самовывоз — без адреса) → способ
оплаты → подтверждение → структурированная заявка владельцу → клиенту номер
заказа (#1001+). Отмена чистит только оформление, корзина сохраняется.
Защита от повторной доставки одного update — по `update_id`
(`lib/telegram/store.ts`). Если `TELEGRAM_ADMIN_CHAT_ID` не настроен или
отправка владельцу не удалась — клиенту сообщается честно, заказ НЕ
принимается.

Тесты сценария без сети: `node scripts/telegram-scenario.test.mjs`.

Состояние диалога живёт в Map внутри экземпляра функции (Vercel serverless):
это демо-решение, устойчивое к потере состояния — при сбросе сессии бот
возвращает пользователя в `/start`. В продакшене слой `store.ts` меняется на
KV/БД без правок сценария.

### Переменные окружения (Vercel → Settings → Environment Variables)

- `TELEGRAM_BOT_TOKEN` — токен бота (уже добавлен).
- `TELEGRAM_ADMIN_CHAT_ID` — chat ID владельца, получатель заявок (добавить).
  Получить: написать боту @userinfobot (или боту от своего аккаунта) и взять ID.

После деплоя один раз зарегистрировать вебхук (подставить токен и домен):
`https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/telegram/webhook`

`services/orderService.ts::submitOrder()` (сайт) остаётся mock-слоем с `TODO`:
форма заказа на сайте пока не ходит в Telegram — это следующий этап.

## Дисклеймеры демо

- Фотографии — процедурные плейсхолдеры (см. `public/images/README.md`
  и `scripts/generate-images.mjs`); реальные снимки подставляются
  одноимёнными файлами без правки кода.
- Оплата, авторизация, CRM, карты — не реализованы и не запланированы
  на этом этапе.

/**
 * Генератор локальных изображений для /public/images.
 *
 * Песочница сборки не имеет доступа к внешним CDN, поэтому «фотографии»
 * рисуются процедурно (SVG → растер → JPEG) в едином премиальном стиле:
 * тёмный фон, крупный объект, начинка, мясо, овощи, соус, пар.
 *
 * ЗАМЕНА НА РЕАЛЬНЫЕ ФОТО: просто перезапишите одноимённые .jpg файлы
 * в public/images (см. public/images/README.md). Код править не нужно.
 *
 * Запуск:  node scripts/generate-images.mjs
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images");
mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Детерминированный PRNG (mulberry32)                                 */
/* ------------------------------------------------------------------ */

function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.round(min + next() * (max - min)),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}

/* ------------------------------------------------------------------ */
/* Вспомогательные генераторы фигур                                    */
/* ------------------------------------------------------------------ */

function ellipse(x, y, rx, ry, fill, opts = {}) {
  const { opacity = 1, rotate = 0, stroke = null, strokeWidth = 0 } = opts;
  const rot = rotate ? ` transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"` : "";
  const s = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : "";
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}"${s} opacity="${opacity}"${rot}/>`;
}

function meatChunk(x, y, w, h, angle, gradId, charColor, rng) {
  const parts = [];
  parts.push(
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})">` +
      `<rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h * 0.42).toFixed(1)}" fill="url(#${gradId})"/>`,
  );
  // Подпалины от гриля
  const marks = rng.int(1, 3);
  for (let i = 0; i < marks; i += 1) {
    const mx = rng.range(-w * 0.32, w * 0.2);
    const my = rng.range(-h * 0.28, h * 0.22);
    const mw = rng.range(w * 0.22, w * 0.42);
    parts.push(
      `<path d="M ${mx.toFixed(1)} ${my.toFixed(1)} q ${(mw / 2).toFixed(1)} ${rng.range(-3, 3).toFixed(1)} ${mw.toFixed(1)} 0" stroke="${charColor}" stroke-width="${rng.range(3, 5).toFixed(1)}" fill="none" stroke-linecap="round" opacity="${rng.range(0.55, 0.85).toFixed(2)}"/>`,
    );
  }
  // Блик
  parts.push(
    `<ellipse cx="${rng.range(-w * 0.15, 0).toFixed(1)}" cy="${(-h * 0.16).toFixed(1)}" rx="${(w * 0.28).toFixed(1)}" ry="${(h * 0.14).toFixed(1)}" fill="#ffffff" opacity="0.14"/>`,
  );
  parts.push("</g>");
  return parts.join("");
}

function lettuceLeaf(x, y, size, rng, greens) {
  const g1 = rng.pick(greens);
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rng.range(-40, 40).toFixed(1)})">` +
    `<path d="M ${-size} 0 q ${size * 0.4} ${-size * 0.9} ${size} ${-size * 0.25} q ${size * 0.7} ${-size * 0.6} ${size} ${size * 0.05} q ${-size * 0.5} ${size * 0.55} ${-size} ${size * 0.3} q ${-size * 0.6} ${size * 0.15} ${-size} ${-size * 0.15} z" fill="${g1}" opacity="0.94"/>` +
    `<path d="M ${-size * 0.5} ${size * 0.05} q ${size * 0.5} ${-size * 0.35} ${size} ${-size * 0.05}" stroke="${rng.pick(greens)}" stroke-width="${(size * 0.16).toFixed(1)}" fill="none" opacity="0.55"/>` +
    `</g>`
  );
}

function tomatoPiece(x, y, r, rng) {
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rng.range(-30, 30).toFixed(1)})">` +
    `<path d="M ${-r} 0 a ${r} ${r} 0 0 1 ${2 * r} 0 z" fill="#c23a24"/>` +
    `<path d="M ${-r * 0.78} 0 a ${r * 0.78} ${r * 0.78} 0 0 1 ${r * 1.56} 0 z" fill="#e05a37" opacity="0.9"/>` +
    `</g>`
  );
}

function cucumberSlice(x, y, r) {
  return (
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#4d6f2b"/>` +
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.78).toFixed(1)}" fill="#cfe3a7"/>`
  );
}

function onionRing(x, y, r, rng) {
  return `<path d="M ${(x - r).toFixed(1)} ${y.toFixed(1)} a ${r} ${r * 0.55} 0 0 ${rng.pick([0, 1])} ${(2 * r).toFixed(1)} ${(rng.range(-6, 6)).toFixed(1)}" stroke="#e3d3e6" stroke-width="4.5" fill="none" opacity="0.8" stroke-linecap="round"/>`;
}

function chiliPepper(x, y, len, angle, rng) {
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})">` +
    `<path d="M ${-len / 2} 0 q ${len * 0.25} ${-len * 0.28} ${len * 0.55} ${-len * 0.06} q ${len * 0.22} ${len * 0.14} ${len * 0.2} ${len * 0.06} q ${-len * 0.12} ${len * 0.2} ${-len * 0.42} ${len * 0.16} q ${-len * 0.31} ${-len * 0.02} ${-len * 0.33} ${-len * 0.16} z" fill="url(#chiliGrad)"/>` +
    `<path d="M ${len * 0.33} ${-len * 0.02} q ${len * 0.08} ${-len * 0.05} ${len * 0.14} ${-len * 0.02}" stroke="#4c702a" stroke-width="${(len * 0.05).toFixed(1)}" fill="none" stroke-linecap="round"/>` +
    `</g>`
  );
}

function chiliFlakes(cx, cy, rx, ry, count, rng) {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next());
    const x = cx + rx * rr * Math.cos(a);
    const y = cy + ry * rr * Math.sin(a);
    const s = rng.range(3, 6);
    out += `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 4).toFixed(1)}" width="${s.toFixed(1)}" height="${(s / 2).toFixed(1)}" rx="1.5" fill="#ff4d28" opacity="${rng.range(0.5, 0.9).toFixed(2)}" transform="rotate(${rng.range(0, 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return out;
}

function sauceZigzag(cx, cy, width, count, color, rng) {
  const step = width / count;
  let d = `M ${(cx - width / 2).toFixed(1)} ${cy.toFixed(1)}`;
  let up = true;
  for (let i = 1; i <= count; i += 1) {
    const x = cx - width / 2 + i * step;
    const y = cy + (up ? rng.range(8, 16) : rng.range(-16, -8));
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    up = !up;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`;
}

function cheeseDrip(x, topY, len, w) {
  return (
    `<path d="M ${(x - w / 2).toFixed(1)} ${topY.toFixed(1)} L ${(x - w / 2).toFixed(1)} ${(topY + len).toFixed(1)} Q ${x.toFixed(1)} ${(topY + len + w * 1.15).toFixed(1)} ${(x + w / 2).toFixed(1)} ${(topY + len).toFixed(1)} L ${(x + w / 2).toFixed(1)} ${topY.toFixed(1)} Z" fill="url(#cheeseDripGrad)"/>` +
    `<ellipse cx="${(x - w * 0.12).toFixed(1)}" cy="${(topY + len * 0.45).toFixed(1)}" rx="${(w * 0.15).toFixed(1)}" ry="${(len * 0.26).toFixed(1)}" fill="#ffe6a3" opacity="0.4"/>`
  );
}

function steamPath(x, y, height, width, rng) {
  const wob = width;
  return `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} C ${(x - wob).toFixed(1)} ${(y - height * 0.3).toFixed(1)}, ${(x + wob).toFixed(1)} ${(y - height * 0.55).toFixed(1)}, ${(x - wob * 0.35).toFixed(1)} ${(y - height * 0.78).toFixed(1)} S ${(x + wob * 0.2).toFixed(1)} ${(y - height).toFixed(1)}, ${(x - wob * 0.15).toFixed(1)} ${(y - height * 1.08).toFixed(1)}" stroke="url(#steamFade)" stroke-width="13" fill="none" stroke-linecap="round" opacity="${rng.range(0.5, 0.9).toFixed(2)}"/>`;
}

/* ------------------------------------------------------------------ */
/* Сцены                                                               */
/* ------------------------------------------------------------------ */

const scenes = {
  "classic-chicken": {
    seed: 11,
    meatGrad: ["#d29a55", "#96602a"],
    char: "#3d2309",
    sauce: "#f5e9d3",
    lettuce: ["#55812c", "#6b9c39", "#466d24"],
    toppings: { tomato: 4, cucumber: 3, onion: 0, chili: 0, cheeseDrips: 0, cheeseLayer: false, flakes: 0 },
    moundTint: null,
  },
  "spicy-beef": {
    seed: 23,
    meatGrad: ["#94402d", "#552015"],
    char: "#1f0a05",
    sauce: "#eba62e",
    lettuce: ["#4d7529", "#5f8f33"],
    toppings: { tomato: 3, cucumber: 1, onion: 4, chili: 3, cheeseDrips: 0, cheeseLayer: false, flakes: 16 },
    moundTint: "#e2390f",
  },
  "cheese-chicken": {
    seed: 37,
    meatGrad: ["#d29a55", "#96602a"],
    char: "#3d2309",
    sauce: "#f7eeda",
    lettuce: ["#55812c", "#6b9c39"],
    toppings: { tomato: 3, cucumber: 2, onion: 0, chili: 0, cheeseDrips: 7, cheeseLayer: true, flakes: 0 },
    moundTint: "#f5b93c",
  },
  "hero-shawarma": {
    seed: 5,
    portrait: true,
    meatGrad: ["#cf9752", "#8f5c28"],
    char: "#3a2109",
    sauce: "#f5e9d3",
    lettuce: ["#55812c", "#6b9c39", "#466d24"],
    toppings: { tomato: 5, cucumber: 3, onion: 1, chili: 1, cheeseDrips: 2, cheeseLayer: false, flakes: 4 },
    moundTint: null,
  },
};

function buildScene(name, cfg) {
  const rng = makeRng(cfg.seed);
  const W = 1200;
  const H = cfg.portrait ? 1500 : 900;

  const cx = W * 0.5;
  const rimY = H * (cfg.portrait ? 0.36 : 0.37);
  const rx0 = W * 0.15;
  const ry0 = rx0 * 0.38;
  const tipY = H * 0.92;

  const defs = `
    <defs>
      <linearGradient id="paperGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#585248"/>
        <stop offset="0.22" stop-color="#ded8cb"/>
        <stop offset="0.5" stop-color="#b6af9f"/>
        <stop offset="0.78" stop-color="#7d7568"/>
        <stop offset="1" stop-color="#4d4840"/>
      </linearGradient>
      <linearGradient id="meatGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cfg.meatGrad[0]}"/>
        <stop offset="1" stop-color="${cfg.meatGrad[1]}"/>
      </linearGradient>
      <linearGradient id="cheeseDripGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2c257"/>
        <stop offset="1" stop-color="#dfa034"/>
      </linearGradient>
      <linearGradient id="chiliGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e8482f"/>
        <stop offset="1" stop-color="#a31f15"/>
      </linearGradient>
      <linearGradient id="steamFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.10"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.22"/>
      </linearGradient>
      <radialGradient id="bgGlow" cx="0.5" cy="0.4" r="0.72">
        <stop offset="0" stop-color="#4a3210" stop-opacity="0.6"/>
        <stop offset="0.55" stop-color="#241806" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#0b0b0b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="warmGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f59e0b" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="shadowGrad" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#000000" stop-opacity="0.85"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="rimGrad" cx="0.42" cy="0.38" r="0.85">
        <stop offset="0" stop-color="#d8ab63"/>
        <stop offset="0.6" stop-color="#b3813e"/>
        <stop offset="1" stop-color="#7c521f"/>
      </radialGradient>
      <radialGradient id="moundGrad" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#3b2a15"/>
        <stop offset="1" stop-color="#191005"/>
      </radialGradient>
      <radialGradient id="vignette" cx="0.5" cy="0.46" r="0.72">
        <stop offset="0" stop-color="#000000" stop-opacity="0"/>
        <stop offset="0.68" stop-color="#000000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.62"/>
      </radialGradient>
    </defs>`;

  /* --- фон --- */
  let background = `<rect width="${W}" height="${H}" fill="#0b0b0b"/>
    <rect width="${W}" height="${H}" fill="url(#bgGlow)"/>
    <ellipse cx="${cx}" cy="${(H * 0.44).toFixed(0)}" rx="${(W * 0.3).toFixed(0)}" ry="${(H * 0.34).toFixed(0)}" fill="url(#warmGlow)"/>`;

  /* --- столешница и тень --- */
  const counter = `<ellipse cx="${cx}" cy="${(H * 0.96).toFixed(0)}" rx="${(W * 0.52).toFixed(0)}" ry="${(H * 0.06).toFixed(0)}" fill="#16100a" opacity="0.9"/>
    <ellipse cx="${cx}" cy="${(tipY + (H - tipY) * 0.45).toFixed(0)}" rx="${(W * 0.26).toFixed(0)}" ry="${(H * 0.028).toFixed(0)}" fill="url(#shadowGrad)"/>`;

  /* --- шапка начинки (грива) --- */
  const moundCX = cx;
  const moundCY = rimY - ry0 * 0.55;
  const moundRX = rx0 * 0.99;
  const moundRY = ry0 * 1.75;

  let rim = ellipse(cx, rimY, rx0 + 8, ry0 + 5, "url(#rimGrad)");
  // Обжаренные пятна на лаваше
  for (let i = 0; i < 9; i += 1) {
    const a = rng.range(-Math.PI * 0.97, -Math.PI * 0.03);
    rim += ellipse(cx + Math.cos(a) * rx0 * rng.range(0.55, 0.98), rimY + Math.sin(a) * ry0 * rng.range(0.5, 1.0), rng.range(6, 16), rng.range(4, 8), "#5a3a12", { opacity: rng.range(0.35, 0.6).toFixed(2), rotate: rng.range(0, 180) });
  }

  let mound = ellipse(moundCX, moundCY, moundRX, moundRY, "url(#moundGrad)");

  /* --- ингредиенты: слоями --- */
  const scatter = (count, fn) => {
    let out = "";
    for (let i = 0; i < count; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      const rr = Math.sqrt(rng.next());
      out += fn(moundCX + moundRX * 0.82 * rr * Math.cos(a), moundCY + moundRY * 0.8 * rr * Math.sin(a), i);
    }
    return out;
  };

  let ingredients = scatter(rng.int(6, 8), (x, y) => lettuceLeaf(x, y - rng.range(4, 14), rng.range(26, 44), rng, cfg.lettuce));
  ingredients += scatter(cfg.portrait ? 26 : 22, (x, y) =>
    meatChunk(x, y, rng.range(46, 78), rng.range(22, 32), rng.range(-38, 38), "meatGrad", cfg.char, rng));
  ingredients += scatter(cfg.toppings.tomato, (x, y) => tomatoPiece(x, y, rng.range(16, 24), rng));
  ingredients += scatter(cfg.toppings.cucumber, (x, y) => cucumberSlice(x, y, rng.range(12, 17)));
  ingredients += scatter(cfg.toppings.onion, (x, y) => onionRing(x, y, rng.range(16, 26), rng));
  ingredients += scatter(cfg.toppings.chili, (x, y) => chiliPepper(x, y - 6, rng.range(46, 62), rng.range(-50, 50), rng));
  if (cfg.toppings.flakes) ingredients += chiliFlakes(moundCX, moundCY - moundRY * 0.3, moundRX * 0.85, moundRY * 0.65, cfg.toppings.flakes, rng);

  /* --- сыр: расплавленный слой --- */
  if (cfg.toppings.cheeseLayer) {
    ingredients += `<path d="M ${(moundCX - moundRX * 0.94).toFixed(1)} ${(moundCY - moundRY * 0.1).toFixed(1)} q ${(moundRX * 0.3).toFixed(1)} ${(-moundRY * 0.85).toFixed(1)} ${(moundRX * 0.62).toFixed(1)} ${(-moundRY * 0.42).toFixed(1)} q ${(moundRX * 0.42).toFixed(1)} ${(-moundRY * 0.22).toFixed(1)} ${(moundRX * 0.94).toFixed(1)} ${(moundRY * 0.12).toFixed(1)} q ${(-moundRX * 0.4).toFixed(1)} ${(moundRY * 0.5).toFixed(1)} ${(-moundRX * 0.9).toFixed(1)} ${(moundRY * 0.34).toFixed(1)} q ${(-moundRX * 0.35).toFixed(1)} ${(-moundRY * 0.02).toFixed(1)} ${(-moundRX * 0.66).toFixed(1)} ${(-moundRY * 0.04).toFixed(1)} z" fill="url(#cheeseDripGrad)" opacity="0.92"/>`;
    ingredients += ellipse(moundCX - moundRX * 0.32, moundCY - moundRY * 0.28, 13, 7, "#ffe9b0", { opacity: 0.75, rotate: -18 });
    ingredients += ellipse(moundCX + moundRX * 0.28, moundCY - moundRY * 0.08, 10, 5.5, "#ffe9b0", { opacity: 0.65, rotate: 12 });
  }

  /* --- соус зигзагом сверху --- */
  ingredients += sauceZigzag(moundCX, moundCY - moundRY * 0.12, moundRX * 1.3, rng.int(6, 8), cfg.sauce, rng);
  ingredients += sauceZigzag(moundCX - moundRX * 0.1, moundCY + moundRY * 0.16, moundRX * 1.0, rng.int(5, 7), cfg.sauce, rng);

  /* --- кунжут на ободе лаваша --- */
  let seeds = "";
  for (let i = 0; i < 12; i += 1) {
    const a = rng.range(-Math.PI * 0.95, -Math.PI * 0.05);
    seeds += ellipse(cx + Math.cos(a) * rx0 * rng.range(0.6, 0.99), rimY + Math.sin(a) * ry0 * rng.range(0.55, 1.05), rng.range(3.4, 5), rng.range(1.8, 2.6), "#eed9a6", { opacity: rng.range(0.5, 0.85).toFixed(2), rotate: rng.range(0, 180) });
  }

  /* --- бумажный конверт (передняя стенка) --- */
  const xl = cx - rx0;
  const xr = cx + rx0;
  const tipL = cx - rx0 * 0.1;
  const tipR = cx + rx0 * 0.1;
  const midY = (rimY + tipY) / 2;
  const paper = `
    <path d="M ${xl.toFixed(1)} ${rimY.toFixed(1)}
      C ${(xl + (tipL - xl) * 0.2).toFixed(1)} ${(rimY + (tipY - rimY) * 0.32).toFixed(1)}, ${(tipL - rx0 * 0.16).toFixed(1)} ${(rimY + (tipY - rimY) * 0.66).toFixed(1)}, ${tipL.toFixed(1)} ${(tipY - 26).toFixed(1)}
      Q ${(cx - rx0 * 0.05).toFixed(1)} ${(tipY + 14).toFixed(1)}, ${cx.toFixed(1)} ${(tipY + 14).toFixed(1)}
      Q ${(cx + rx0 * 0.05).toFixed(1)} ${(tipY + 14).toFixed(1)}, ${tipR.toFixed(1)} ${(tipY - 26).toFixed(1)}
      C ${(tipR + rx0 * 0.16).toFixed(1)} ${(rimY + (tipY - rimY) * 0.66).toFixed(1)}, ${(xr - (xr - tipR) * 0.2 + rx0 * 0.16).toFixed(1)} ${(rimY + (tipY - rimY) * 0.32).toFixed(1)}, ${xr.toFixed(1)} ${rimY.toFixed(1)}
      C ${(xr - rx0 * 0.2).toFixed(1)} ${(rimY + ry0 * 1.28).toFixed(1)}, ${(xl + rx0 * 0.2).toFixed(1)} ${(rimY + ry0 * 1.28).toFixed(1)}, ${xl.toFixed(1)} ${rimY.toFixed(1)} Z"
      fill="url(#paperGrad)"/>
    <path d="M ${(cx - rx0 * 0.02).toFixed(1)} ${(rimY + ry0 * 0.7).toFixed(1)} L ${(cx + rx0 * 0.02).toFixed(1)} ${(tipY - 12).toFixed(1)}" stroke="#6a6458" stroke-width="2.6" opacity="0.4" fill="none"/>
    <path d="M ${(xl + rx0 * 0.18).toFixed(1)} ${(rimY + ry0 * 0.55).toFixed(1)} Q ${(xl + (tipL - xl) * 0.45).toFixed(1)} ${midY.toFixed(1)}, ${(tipL + rx0 * 0.05).toFixed(1)} ${(tipY - 34).toFixed(1)}" stroke="#6a6458" stroke-width="2.2" opacity="0.35" fill="none"/>
    <ellipse cx="${(xl + rx0 * 0.28).toFixed(1)}" cy="${(rimY + (tipY - rimY) * 0.3).toFixed(1)}" rx="${(rx0 * 0.14).toFixed(1)}" ry="${((tipY - rimY) * 0.16).toFixed(1)}" fill="#ffffff" opacity="0.06"/>`;

  /* --- сырные потёки поверх бумаги --- */
  let drips = "";
  for (let i = 0; i < cfg.toppings.cheeseDrips; i += 1) {
    const t = rng.range(0.18, 0.82);
    const x = xl + rx0 * 2 * t;
    const y = rimY + ry0 * 1.12 * Math.sin(Math.PI * t) * 0.9;
    drips += cheeseDrip(x, y, rng.range(36, 120), rng.range(10, 15), rng);
  }

  /* --- пар --- */
  const steam =
    steamPath(cx - rx0 * 0.42, rimY - moundRY * 1.15, H * (cfg.portrait ? 0.22 : 0.26), 26, rng) +
    steamPath(cx + rx0 * 0.18, rimY - moundRY * 1.32, H * (cfg.portrait ? 0.25 : 0.3), 30, rng) +
    steamPath(cx + rx0 * 0.55, rimY - moundRY * 1.05, H * (cfg.portrait ? 0.2 : 0.24), 22, rng);

  /* --- крошки на столе --- */
  let crumbs = "";
  for (let i = 0; i < 10; i += 1) {
    const x = rng.pick([rng.range(0.06, 0.22), rng.range(0.78, 0.94)]) * W;
    const y = rng.range(0.86, 0.97) * H;
    crumbs += rng.next() > 0.5
      ? ellipse(x, y, rng.range(2.5, 5), rng.range(1.5, 2.5), "#e8d3a2", { opacity: rng.range(0.25, 0.6).toFixed(2), rotate: rng.range(0, 180) })
      : ellipse(x, y, rng.range(2, 4), rng.range(1.5, 2.4), "#7e3a1b", { opacity: rng.range(0.3, 0.7).toFixed(2) });
  }

  const tint = cfg.moundTint
    ? `<ellipse cx="${moundCX}" cy="${(moundCY - moundRY * 0.25).toFixed(1)}" rx="${(moundRX * 1.15).toFixed(1)}" ry="${(moundRY * 0.95).toFixed(1)}" fill="${cfg.moundTint}" opacity="${cfg.name === "cheese-chicken" ? 0.1 : 0.13}"/>`
    : "";

  const tilt = `rotate(${cfg.portrait ? -10 : -6} ${cx} ${(rimY + tipY) / 2})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    ${background}
    ${counter}
    <g transform="${tilt}">
      ${mound}
      ${rim}
      ${ingredients}
      ${tint}
      ${seeds}
      ${paper}
      ${drips}
    </g>
    ${steam}
    ${crumbs}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Рендер                                                              */
/* ------------------------------------------------------------------ */

const targets = Object.entries(scenes).map(([name, cfg]) => ({
  name,
  cfg: { ...cfg, name },
}));

for (const { name, cfg } of targets) {
  const svg = buildScene(name, cfg);
  const H = cfg.portrait ? 1500 : 900;

  // Сохраняем и SVG-исходник — удобно для ручной доработки стиля.
  writeFileSync(join(OUT_DIR, `${name}.svg`), svg, "utf8");

  // Плёночное зерно генерируем отдельным слоем (sharp >= 0.35).
  const grain = await sharp({
    create: {
      width: 1200,
      height: H,
      channels: 1,
      noise: { type: "gaussian", mean: 128, sigma: 16 },
    },
  })
    .png()
    .toBuffer();

  try {
    await sharp(Buffer.from(svg))
      .flatten({ background: "#0b0b0b" })
      .composite([{ input: grain, blend: "soft-light", opacity: 0.5 }])
      .jpeg({ quality: 87 })
      .toFile(join(OUT_DIR, `${name}.jpg`));
  } catch (e) {
    console.error(`FAILED ${name}: ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`generated public/images/${name}.jpg`);
}

console.log("Done.");

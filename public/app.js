"use strict";

const app = document.querySelector("#app");
const nav = document.querySelector("#main-nav");
const headerActions = document.querySelector("#header-actions");
const footer = document.querySelector("#site-footer");
const menuToggle = document.querySelector(".menu-toggle");

let catalog = { directions: [], materials: [] };
let legal = {};
let directionMap = {};

const ICONS = {
  meditation: '<circle cx="12" cy="10" r="4"/><path d="M3.5 16.5h17M7 20h10"/>',
  modeling: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  text: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
  video: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  open: '<path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0"/><path d="m9.5 12 2 2 3.5-4"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M14.5 12v2"/>',
  pen: '<path d="M4 20l4.5-1L19 8.5 15.5 5 5 15.5z"/><path d="m13.5 7 3.5 3.5M4 20h7"/>'
};
const DEFAULT_LABELS = {
  exercise: "Задание", when: "Когда пригодится", steps: "Шаги", examples: "Примеры", benefits: "Что вы освоите",
  fit: "Как проверить себя", mistakes: "Частые ошибки и что попробовать", note: "Справка"
};
const STATUS = {
  "опубликован": { label: "Доступен", cls: "badge-ready" },
  "демонстрационный": { label: "Демонстрация", cls: "badge-demo" },
  "готовится": { label: "Готовится", cls: "badge-soon" }
};
const RIDGE = '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="ridge-far" d="M0 120V78l70-16 80 10 110-40 70 22 90-30 100 34 80-14 110 30 120-44 90 26 110-12 80 20 100-8v72z"/><path class="ridge-near" d="M0 120V100l90-22 60 12 100-38 70 26 70-14 90-34 80 44 70-12 80 26 110-42 70 24 80-6 90 30 100-20 50 10v46z"/></svg>';
const MARK = '<svg viewBox="0 0 32 32" focusable="false" aria-hidden="true"><path d="m4 23 8-13 5.2 8 3.1-4.8 7.7 9.8H4Z"/><path d="M7 23h18"/></svg>';

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function icon(name, cls = "icon") {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.text}</svg>`;
}
function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
function pathInfo() { return decodeURI(location.pathname).split("/").filter(Boolean); }
function link(url, label, cls = "") { return `<a class="${cls}" href="${url}">${label}</a>`; }
function setTitle(title) { document.title = title ? `${title} — Freelearn` : "Freelearn — учиться в своём темпе"; }
function materialsOf(id) { return catalog.materials.filter(item => item.direction === id).sort((a, b) => a.order - b.order); }
function findMaterial(id) { return catalog.materials.find(item => item.id === id); }
function isAvailable(item) { return item.status !== "готовится"; }
function materialHref(item) { return `/material/${encodeURIComponent(item.id)}`; }
function countLabel(d, n) { return n ? `${n} ${plural(n, d.plural)}` : `${d.short} готовятся`; }
function safeUrl(url) { return /^(https?:\/\/|\/)/.test(url || "") ? url : "#"; }
function statusBadge(item) {
  const status = STATUS[item.status] || STATUS["готовится"];
  return `<span class="badge ${status.cls}">${status.label}</span>`;
}

/* ——— Шапка и подвал ——— */
function renderHeader() {
  const [page, id] = pathInfo();
  const navLink = (href, label, active, cls = "") => `<a class="${cls}${active ? " active" : ""}" href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
  nav.innerHTML = catalog.directions.map(d => navLink(`/direction/${d.id}`, escapeHTML(d.title),
      (page === "direction" && id === d.id) || (page === "material" && findMaterial(id)?.direction === d.id))).join("")
    + navLink("/book", "Книга", page === "book")
    + navLink("/about", "Цель проекта", page === "about", "nav-compact-only");
  headerActions.innerHTML = navLink("/about", "Цель проекта", page === "about", "header-link nav-wide-only");
}
function renderFooter() {
  footer.innerHTML = `<div class="footer-ridge">${RIDGE}</div><div class="footer-inner"><div class="footer-brand"><a class="brand" href="/"><span class="brand-mark">${MARK}</span><span class="brand-name">Freelearn</span></a><p>Бесплатно. Открыто. В своём темпе.</p></div><nav class="footer-col" aria-label="Направления"><h2>Направления</h2>${catalog.directions.map(d => link(`/direction/${d.id}`, escapeHTML(d.title))).join("")}</nav><nav class="footer-col" aria-label="Проект"><h2>Проект</h2>${link("/book", "Книга")}${link("/about", "Цель проекта")}${link("/privacy", "Конфиденциальность")}${link("/terms", "Правила использования")}</nav><p class="footer-note">Материалы о заботе о себе носят информационно-просветительский характер и не заменяют профессиональную помощь.</p></div>`;
}
function setMenu(open) {
  nav.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (open) nav.querySelector("a")?.focus();
}

/* ——— Главная ——— */
function renderHome() {
  setTitle("");
  const cards = catalog.directions.map(d => {
    const n = materialsOf(d.id).length;
    return `<a class="direction-card" href="/direction/${d.id}"><span class="icon-tile">${icon(d.id)}</span><h3>${escapeHTML(d.title)}</h3><p>${escapeHTML(d.description)}</p><span class="direction-card-meta"><span>${escapeHTML(countLabel(d, n))}</span>${icon("arrow")}</span></a>`;
  }).join("");
  return `<div class="page page-home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Пространство для нового</p>
        <h1>Находить увлечения и&nbsp;заботиться о&nbsp;себе</h1>
        <p class="hero-lead">Бесплатные материалы о хобби, творчестве, новых навыках и заботе о себе. Наша цель — помогать находить увлечения, единомышленников и поддержку.</p>
        <div class="hero-actions"><a class="button" href="#directions">Выбрать направление ${icon("arrow")}</a><a class="button button-ghost" href="/about">Цель проекта</a></div>
      </div>
      <div class="promise"><span class="promise-rule" aria-hidden="true"></span><div><h2>Бесплатно. Без рекламы. Всегда.</h2><p>Все материалы — текущие и будущие — останутся полностью бесплатными и без рекламы.</p></div></div>
      <figure class="hero-visual"><div class="hero-photo" role="img" aria-label="Заснеженная вершина Маттерхорна в чёрно-белых тонах"></div><figcaption>свой путь · свой темп</figcaption></figure>
    </section>
    <section class="section" id="directions" aria-labelledby="directions-title">
      <div class="section-head"><div><p class="eyebrow">Направления</p><h2 id="directions-title">С чего начнём?</h2></div><p>Все материалы открыты и доступны без аккаунта</p></div>
      <div class="direction-grid">${cards}</div>
    </section>
    <section class="section" aria-labelledby="how-title">
      <div class="section-head"><div><p class="eyebrow">Как это устроено</p><h2 id="how-title">Спокойно и по шагам</h2></div></div>
      <ol class="how-list">
        <li><span class="how-num">1</span><h3>Выберите направление</h3><p>Материалы открыты и доступны в любом порядке.</p></li>
        <li><span class="how-num">2</span><h3>Занимайтесь по шагам</h3><p>У каждой медитации есть видео, описание и текст подсказок. В других направлениях пока доступны демонстрационные материалы.</p></li>
        <li><span class="how-num">3</span><h3>Возвращайтесь в своём темпе</h3><p>Все занятия открыты. Выбирайте любую практику и возвращайтесь к ней, когда удобно.</p></li>
      </ol>
    </section>
    <section class="book-teaser"><span class="icon-tile icon-tile-large">${icon("book")}</span><div><p class="eyebrow">Книга</p><h2>Повседневная медитация</h2><p>Краткий путеводитель по десяти видам практик. Бесплатно, PDF и EPUB на трёх языках.</p></div><a class="button button-ghost" href="/book">Открыть книгу ${icon("arrow")}</a></section>
    
  </div>`;
}

/* ——— Шаблон направления ——— */
function materialCard(item) {
  const cover = item.cover ? `<img src="/${escapeHTML(item.cover)}" alt="" loading="lazy">` : `<span class="card-number">${String(item.order).padStart(2, "0")}</span>`;
  const meta = [item.duration ? `${icon("clock")}${escapeHTML(String(item.duration))}` : "", !isAvailable(item) ? "" : item.video ? `${icon("video")}Видео` : `${icon("text")}Текст`].filter(Boolean);
  return `<a class="material-card" href="${materialHref(item)}"><span class="material-cover">${cover}</span><span class="material-body"><span class="material-badges">${statusBadge(item)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><span class="material-meta">${meta.join('<span class="dot" aria-hidden="true"></span>')}</span></span><span class="material-arrow">${icon("arrow")}</span></a>`;
}
function renderDirection(id) {
  const d = directionMap[id];
  if (!d) return renderNotFound();
  setTitle(d.title);
  const items = materialsOf(id);
  const how = d.how?.length ? `<section class="section section-tight" aria-labelledby="how-title"><h2 class="section-title" id="how-title">Как заниматься</h2><ol class="how-list how-list-compact">${d.how.map((s, i) => `<li><span class="how-num">${i + 1}</span><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.text)}</p></li>`).join("")}</ol></section>` : "";
  const guideCards = (d.guide || []).map(g => {
    const targets = (g.materials || []).map(findMaterial).filter(Boolean);
    return `<article class="guide-card"><h3>${escapeHTML(g.title)}</h3><p>${escapeHTML(g.text || "")}</p>${targets.length ? `<div class="guide-links">${targets.map(t => link(materialHref(t), `${escapeHTML(t.title)} ${icon("arrow")}`)).join("")}</div>` : ""}</article>`;
  }).join("");
  const guide = guideCards ? `<section class="section section-tight" aria-labelledby="guide-title"><h2 class="section-title" id="guide-title">С чего начать</h2><div class="guide-grid">${guideCards}</div></section>` : "";
  const list = items.length
    ? `<div class="material-list${items.some(item => item.video) ? " video-catalog" : ""}">${items.map(materialCard).join("")}</div>`
    : `<div class="empty-state">${icon("leaf", "icon empty-icon")}<h3>${escapeHTML(d.short)} появятся позже</h3><p>Сейчас здесь пусто. Загляните позже — все материалы будут открыты.</p></div>`;
  return `<div class="page">
    <nav class="breadcrumbs" aria-label="Путь">${link("/", "Главная")}<span aria-hidden="true">/</span><span>${escapeHTML(d.title)}</span></nav>
    <header class="direction-hero">
      <span class="icon-tile icon-tile-large">${icon(id)}</span>
      <div><p class="eyebrow">Направление</p><h1 class="page-title">${escapeHTML(d.title)}</h1><p class="lead">${escapeHTML(d.description)}${d.intro ? ` ${escapeHTML(d.intro)}` : ""}</p>
      <ul class="pill-row"><li>${escapeHTML(countLabel(d, items.length))}</li><li>Бесплатно</li><li>Без регистрации</li><li>В любом порядке</li></ul></div>
    </header>
    ${d.explanation?.length ? `<section class="section section-tight meditation-explanation" aria-labelledby="explanation-title"><h2 class="section-title" id="explanation-title">Что такое медитация</h2>${d.explanation.map(text => `<p>${escapeHTML(text)}</p>`).join("")}</section>` : ""}
    <section class="section section-tight" aria-labelledby="list-title"><div class="section-head"><h2 class="section-title" id="list-title">${escapeHTML(d.short)}${items.length ? ` <span class="count">${items.length}</span>` : ""}</h2></div>${list}</section>
    ${how}${guide}
    ${d.notice ? `<aside class="notice">${icon("info")}<p>${escapeHTML(d.notice)}</p></aside>` : ""}
  </div>`;
}

/* ——— Шаблон материала ——— */
function materialSections(item, L) {
  const sections = [];
  const add = (id, title, html, cls = "") => sections.push({ id, title, html, cls });
  if (item.exercise || item.scheme?.length) {
    add("exercise", L.exercise, `${item.exercise ? `<p>${escapeHTML(item.exercise)}</p>` : ""}${item.scheme?.length ? `<ol class="scheme" aria-label="Схема">${item.scheme.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ol>` : ""}`);
  }
  if (item.when || item.example) {
    add("when", item.when ? L.when : "Пример", `${item.when ? `<p>${escapeHTML(item.when)}</p>` : ""}${item.example ? `<div class="example"><span class="example-label">Пример</span><p>${escapeHTML(item.example)}</p></div>` : ""}`);
  }
  if (item.steps?.length) add("steps", L.steps, `<ol class="steps">${item.steps.map(s => `<li><span>${escapeHTML(s)}</span></li>`).join("")}</ol>`);
  if (item.examples?.length) add("examples", L.examples, `<div class="mini-grid">${item.examples.map(e => `<article class="mini-card"><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.text)}</p></article>`).join("")}</div>`);
  if (item.benefits?.length) add("benefits", L.benefits, `<div class="mini-grid">${item.benefits.map(e => `<article class="mini-card mini-card-plain"><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.text)}</p></article>`).join("")}</div>`);
  if (item.fit) add("fit", L.fit, `<p>${escapeHTML(item.fit)}</p>`);
  if (item.mistakes?.length) add("mistakes", L.mistakes, `<ul class="mistakes">${item.mistakes.map(m => `<li><strong>${escapeHTML(m.title)}</strong><span>${escapeHTML(m.text)}</span></li>`).join("")}</ul>`);
  if (item.music_author || item.music_source || item.music_license) {
    add("music", "Музыка и источники", `<dl class="facts">${item.music_author ? `<dt>Автор музыки</dt><dd>${escapeHTML(item.music_author)}</dd>` : ""}${item.music_source ? `<dt>Источник</dt><dd><a class="text-link" href="${escapeHTML(safeUrl(item.music_source))}" target="_blank" rel="noopener noreferrer">Страница композиции</a></dd>` : ""}${item.music_license ? `<dt>Условия</dt><dd>${item.music_license_url ? `<a class="text-link" href="${escapeHTML(safeUrl(item.music_license_url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.music_license)}</a>` : escapeHTML(item.music_license)}</dd>` : ""}</dl>`);
  }
  if (item.links?.length) add("links", "Дополнительные материалы", `<ul class="link-list">${item.links.map(l => `<li><a href="${escapeHTML(safeUrl(l.url))}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHTML(l.title)} ${icon("arrow")}</a></li>`).join("")}</ul>`);
  if (item.note) add("note", L.note, `<p>${escapeHTML(item.note)}</p>`, "section-note");
  return sections;
}
function videoPath(item) {
  if (!item.video) return "";
  const path = item.video.replace(/^media\//, "");
  return `/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
async function renderMaterial(id) {
  const item = findMaterial(id);
  if (!item) { app.innerHTML = renderNotFound(); return; }
  const d = directionMap[item.direction];
  const L = { ...DEFAULT_LABELS, ...(d.labels || {}) };
  setTitle(item.title);
  const list = materialsOf(item.direction);
  const index = list.findIndex(row => row.id === id), prev = list[index - 1], next = list[index + 1];
  const video = videoPath(item);
  const sections = materialSections(item, L);
  const media = video
    ? `<div class="video-frame"><video id="lesson-video" controls playsinline preload="metadata" poster="/${escapeHTML(item.cover || "")}" src="${escapeHTML(video)}" aria-label="${escapeHTML(item.title)}">${item.subtitles ? `<track kind="subtitles" src="/${escapeHTML(item.subtitles)}" srclang="ru" label="Русские субтитры">` : ""}Ваш браузер не поддерживает видео.</video></div>`
    : isAvailable(item)
      ? `<div class="video-note">${icon("video")}<div><strong>Видео готовится</strong><span>Пока можно заниматься по тексту ниже — всё нужное здесь есть.</span></div></div>`
      : `<div class="video-note">${icon("clock")}<div><strong>${escapeHTML(d.item)} готовится</strong><span>Здесь появятся объяснение, шаги и видео.</span></div></div>`;
  const meta = [statusBadge(item), item.duration ? `<span class="chip">${icon("clock")}${escapeHTML(String(item.duration))}</span>` : "", isAvailable(item) ? `<span class="chip">${video ? `${icon("video")}Видео` : `${icon("text")}Текст`}</span>` : ""].join("");
  const source = item.source ? `<p class="source">Источник: <a href="${escapeHTML(safeUrl(item.source.url))}">${escapeHTML(item.source.title)}</a></p>` : "";
  const toc = sections.length > 2 ? `<nav class="toc" aria-label="Содержание"><h2>На странице</h2>${sections.map(s => `<a href="#${s.id}">${escapeHTML(s.title)}</a>`).join("")}</nav>` : "";
  const pager = (prev || next) ? `<nav class="pager" aria-label="Соседние материалы">${prev ? `<a class="pager-link" href="${materialHref(prev)}">${icon("arrowLeft")}<span><small>Предыдущий материал</small>${escapeHTML(prev.title)}</span></a>` : "<span></span>"}${next ? `<a class="pager-link pager-next" href="${materialHref(next)}"><span><small>Следующий материал</small>${escapeHTML(next.title)}</span>${icon("arrow")}</a>` : "<span></span>"}</nav>` : "";
  app.innerHTML = `<div class="page page-material">
    <nav class="breadcrumbs" aria-label="Путь">${link("/", "Главная")}<span aria-hidden="true">/</span>${link(`/direction/${d.id}`, escapeHTML(d.title))}<span aria-hidden="true">/</span><span>${escapeHTML(d.item)}</span></nav>
    <div class="material-layout${toc ? "" : " material-layout-single"}">
      <article class="material-main">
        <header class="material-head">
          <p class="eyebrow">${escapeHTML(d.item)} ${index + 1} из ${list.length}</p>
          <h1 class="page-title">${escapeHTML(item.title)}</h1>
          <p class="lead">${escapeHTML(item.description)}</p>
          <div class="chip-row">${meta}</div>
        </header>
        ${media}
        ${item.transcript_text?.length ? `<details class="video-transcript"><summary>Текст голосовых подсказок</summary>${item.transcript_text.map(t => `<p>${escapeHTML(t)}</p>`).join("")}</details>` : ""}
        ${item.credits ? `<p class="media-credits"><a class="text-link" href="/${escapeHTML(item.credits)}" target="_blank" rel="noopener noreferrer">Источники и лицензии видео</a></p>` : ""}
        ${sections.map(s => `<section class="content-section ${s.cls}" id="${s.id}"><h2>${escapeHTML(s.title)}</h2>${s.html}</section>`).join("")}
        ${source}
        ${d.notice ? `<aside class="notice">${icon("info")}<p>${escapeHTML(d.notice)}</p></aside>` : ""}
      </article>
      <aside class="material-aside">
        ${toc}
      </aside>
    </div>
    ${pager}
  </div>`;
}

/* ——— Книга ——— */
function renderBook() {
  setTitle("Книга «Повседневная медитация»");
  const root = "/downloads/books/";
  const download = (file, format, language) => `<a class="button button-ghost button-small" href="${root}${encodeURIComponent(file)}" download aria-label="Скачать ${format} — ${language}">${icon("download")}${format}</a>`;
  const editions = [
    { language: "Русский", title: "Русское издание", pdf: "Повседневная медитация — Роман Колпаков.pdf", epub: "Повседневная медитация — Роман Колпаков.epub" },
    { language: "English", title: "English edition", pdf: "Daily Meditation — Roman Kolpakov.pdf", epub: "Daily Meditation — Roman Kolpakov.epub" },
    { language: "العربية", title: "النسخة العربية", pdf: "التأمل اليومي — رومان كولباكوف.pdf", epub: "التأمل اليومي — رومان كولباكوف.epub", rtl: true }
  ];
  return `<div class="page">
    <nav class="breadcrumbs" aria-label="Путь">${link("/", "Главная")}<span aria-hidden="true">/</span><span>Книга</span></nav>
    <section class="book-hero">
      <div class="book-cover" aria-label="Обложка книги «Повседневная медитация»"><div class="book-cover-title"><span>Краткий путеводитель</span><strong>Повседневная<br>медитация</strong><small>10 видов практик</small></div><img src="/book-cover.svg" alt=""><div class="book-cover-author">Роман Колпаков</div></div>
      <div class="book-description"><p class="eyebrow">Книга</p><h1 class="page-title">Повседневная медитация</h1><p class="lead">Краткий путеводитель по десяти видам практик: с объяснениями, инструкциями и примерами.</p>
        <ul class="pill-row"><li>10 практик</li><li>3 языка</li><li>PDF и EPUB</li><li>Бесплатно</li></ul>
        <p class="book-author-line">Автор — Роман Колпаков</p><p class="book-note">В книге указано, что её можно бесплатно распространять при указании автора. Это авторские информационно-просветительские материалы, которые не заменяют медицинскую помощь. Исторические сведения о традициях не требуют принятия веры или участия в обрядах.</p></div>
    </section>
    <section class="section section-tight" aria-labelledby="download-title"><div class="section-head"><h2 class="section-title" id="download-title">Скачать книгу</h2><p>Три языка · два формата</p></div>
      <div class="book-downloads">${editions.map(e => `<article class="book-language-card"${e.rtl ? ' dir="rtl"' : ""}><h3>${e.language}</h3><p>${e.title}</p><div class="book-download-actions" dir="ltr">${download(e.pdf, "PDF", e.language)}${download(e.epub, "EPUB", e.language)}</div></article>`).join("")}</div>
    </section>
  </div>`;
}

/* ——— Цель проекта ——— */
function renderAbout() {
  setTitle("Цель проекта");
  const principle = (ic, title, text) => `<article class="principle">${icon(ic, "icon principle-icon")}<h3>${title}</h3><p>${text}</p></article>`;
  return `<div class="page page-narrow">
    <p class="eyebrow">Цель проекта</p><h1 class="page-title">Вместе становится лучше</h1>
    <p class="lead">Freelearn — авторский волонтёрский информационно-просветительский проект частного лица Романа Колпакова. В основе проекта — хобби, творчество и новые навыки. Его цель — вместе становиться лучше: открывать новые увлечения, находить единомышленников, заботиться о себе и поддерживать друг друга в тяжёлые времена.</p>
    <div class="principles">
      ${principle("pen", "Найти своё увлечение", "3D-моделирование, написание музыки и другие творческие занятия — возможность найти интересное дело и развивать свои способности.")}
      ${principle("leaf", "Заботиться о себе", "Уделять себе время, пробовать практики внимательности и заниматься любимым делом — в удобном ритме и без гонки за результатом.")}
      ${principle("user", "Находить единомышленников", "Наша цель — объединять людей вокруг общих увлечений, создавать поводы для общения и взаимной поддержки.")}
    </div>
    <section class="prose"><h2>Об авторе</h2><p><strong>Роман Колпаков</strong> — программист, дизайнер, композитор, инженер, 3D-моделист и мастер 3D-печати.</p>
    <h2>Статус и содержание проекта</h2><p>Freelearn — волонтёрская инициатива частного лица. Проект не является медицинской, образовательной, религиозной или иной организацией. Материалы предназначены для самостоятельного знакомства с темами вне реализации образовательных программ: без зачисления, аттестации и выдачи документов об образовании. Проект не оказывает медицинскую помощь, не проводит диагностику или лечение. Материалы о заботе о себе носят информационно-просветительский характер и не заменяют профессиональную помощь. Исторические сведения о традициях не являются призывом принять веру или участвовать в обрядах.</p>
    <h2>Бесплатный доступ и поддержка</h2><p>Все текущие и будущие материалы останутся бесплатными и без рекламы. Платные материалы, подписки, функции или привилегии не вводятся и вводиться не будут. Добровольная финансовая поддержка автора по инициативе участников безвозмездна: она не обязательна, не является платой за материалы или услуги, условием доступа и не даёт привилегий.</p>
    <h2>Открытый доступ</h2><p>На сайте нет регистрации, входа и учётных записей. Практики, видео и книга доступны сразу. Сайт не сохраняет персональный прогресс и не устанавливает cookie для отслеживания.</p><p>Подробнее — в ${link("/privacy", "разделе о конфиденциальности", "text-link")}.</p>
    <h2>Связь с автором</h2><p>Telegram: <a class="text-link" href="https://t.me/${escapeHTML(legal.operator_telegram)}" target="_blank" rel="noopener noreferrer">@${escapeHTML(legal.operator_telegram)}</a>. Почта проекта: <a class="text-link" href="mailto:${escapeHTML(legal.operator_email)}">${escapeHTML(legal.operator_email)}</a>. ${link("/terms", "Правила использования", "text-link")}.</p>
    <h2>Небольшие шаги тоже важны</h2><p>Не обязательно знать заранее, куда приведёт новый интерес. Можно начать с одной идеи, небольшого проекта, урока или практики и возвращаться к ним тогда, когда это удобно.</p></section>
  </div>`;
}
function renderNotFound() {
  setTitle("Страница не найдена");
  return `<div class="page"><div class="empty-state">${icon("leaf", "icon empty-icon")}<h1>Страница не найдена</h1><p>Проверьте ссылку или вернитесь на главную.</p><div class="empty-action">${link("/", "На главную", "button")}</div></div></div>`;
}

/* ——— Маршруты и события ——— */
async function render() {
  setMenu(false);
  renderHeader();
  renderFooter();
  const [page, id, extra] = pathInfo();
  if (!page) app.innerHTML = renderHome();
  else if (page === "book" && !id) app.innerHTML = renderBook();
  else if (page === "direction" && !extra) app.innerHTML = renderDirection(id);
  else if (page === "material" && !extra) await renderMaterial(id);
  else if (page === "about" && !id) app.innerHTML = renderAbout();
  else if (["privacy", "terms"].includes(page) && !id) app.innerHTML = renderLegal(page);
  else app.innerHTML = renderNotFound();
}
async function request(url, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  let result = {};
  try { result = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(result.error || "Не удалось выполнить запрос");
    error.code = result.code;
    throw error;
  }
  return result;
}
function go(url) {
  if (url === location.pathname) { render(); return; }
  history.pushState({}, "", url);
  window.scrollTo(0, 0);
  render().then(() => app.focus({ preventScroll: true }));
}
document.addEventListener("click", async event => {
  const a = event.target.closest("a[href]");
  if (a) {
    const href = a.getAttribute("href");
    if (href.startsWith("#") || a.target || a.hasAttribute("download") || a.origin !== location.origin || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    go(a.pathname);
    return;
  }
});
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
document.addEventListener("keydown", event => { if (event.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuToggle.focus(); } });
window.addEventListener("popstate", render);
async function start() {
  try {
    const results = await Promise.all([request("/api/catalog"), request("/legal.json")]);
    catalog = results[0];
    legal = results[1];
    directionMap = Object.fromEntries(catalog.directions.map(d => [d.id, d]));
    await render();
  } catch (error) {
    app.innerHTML = `<div class="page"><div class="empty-state"><h1>Не удалось загрузить сайт</h1><p>${escapeHTML(error.message)} Попробуйте обновить страницу.</p></div></div>`;
  }
}
start();

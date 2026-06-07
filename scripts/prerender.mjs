import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const templatePath = path.join(dist, "index.html");

const docs = {
  overview: {
    route: "/overview/",
    title: "概要と使用方法 | sDB",
    lead: "sDBは、日本の教育機関を検索するためのページです。",
    markdown: fs.readFileSync(path.join(root, "content/ja/overview.md"), "utf8")
  },
  api: {
    route: "/api/",
    title: "APIドキュメント | sDB",
    lead: "sDB API の認証、エンドポイント、リクエスト、レスポンス仕様です。",
    markdown: fs.readFileSync(path.join(root, "content/ja/api.md"), "utf8")
  },
  notices: {
    route: "/notices/",
    title: "注意事項 | sDB",
    lead: "検索結果の出典、加工内容、利用時の注意事項です。",
    markdown: fs.readFileSync(path.join(root, "content/ja/notices.md"), "utf8")
  }
};

const description = "文部科学省公開資料を加工した教育機関検索ページ。";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prerenderStyle() {
  return `<style id="sdb-prerender-style">
.sdb-prerender{font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1f2428;background:#fafaf8;min-height:100vh}
.sdb-prerender a{color:#0e6f6a;font-weight:700}
.sdb-prerender__skip{position:absolute;left:1rem;top:.75rem;z-index:1000;transform:translateY(-160%);background:#fff;color:#1f2428;padding:.65rem .9rem;border:2px solid #b33a3a;border-radius:.5rem}
.sdb-prerender__skip:focus{transform:translateY(0)}
.sdb-prerender header{border-bottom:1px solid #d9ddd9;background:#fafaf8}
.sdb-prerender nav,.sdb-prerender main{max-width:960px;margin:0 auto;padding:1rem}
.sdb-prerender nav{display:flex;gap:1rem;align-items:center}
.sdb-prerender nav a:first-child{font-size:1.25rem;color:#1f2428;text-decoration:none;margin-right:auto}
.sdb-prerender main{padding-block:2rem}
.sdb-prerender h1{font-size:clamp(2.5rem,7vw,5.5rem);line-height:.98;margin:0 0 1rem;font-weight:800}
.sdb-prerender h2{font-size:1.75rem;line-height:1.2;margin:2.25rem 0 1rem}
.sdb-prerender h3{font-size:1.2rem;margin:1.75rem 0 .75rem}
.sdb-prerender p,.sdb-prerender li{font-size:1rem;line-height:1.75;color:#5b646b}
.sdb-prerender pre{overflow:auto;background:#111;color:#fff;padding:1rem;border-radius:.5rem;white-space:pre-wrap}
.sdb-prerender code{overflow-wrap:anywhere}
.sdb-prerender__panel{background:#fff;border:1px solid #d9ddd9;border-radius:.5rem;padding:1rem}
.sdb-prerender__fields{display:grid;gap:.9rem}
.sdb-prerender label{display:grid;gap:.35rem;font-weight:700}
.sdb-prerender input,.sdb-prerender select{min-height:44px;border:1px solid #8d979e;border-radius:.5rem;padding:.6rem;font:inherit;background:#fff;color:#1f2428}
@media (prefers-color-scheme: dark){.sdb-prerender{color:#f5f5f5;background:#000}.sdb-prerender header{background:#000;border-color:rgba(255,255,255,.14)}.sdb-prerender nav a:first-child{color:#f5f5f5}.sdb-prerender__panel{background:#0b0b0b;border-color:rgba(255,255,255,.14)}.sdb-prerender p,.sdb-prerender li{color:#c2c2c2}.sdb-prerender input,.sdb-prerender select{background:#0b0b0b;color:#f5f5f5;border-color:#737373}.sdb-prerender__skip{background:#0b0b0b;color:#f5f5f5}}
</style>`;
}

function nav() {
  return `<header><nav aria-label="主要ナビゲーション">
<a href="/">sDB</a>
<a href="/overview/">概要</a>
<a href="/api/">API</a>
<a href="/notices/">注意事項</a>
</nav></header>`;
}

function shell(main) {
  return `<div class="sdb-prerender">
<a class="sdb-prerender__skip" href="#main-content">本文へスキップ</a>
${nav()}
${main}
</div>`;
}

function home() {
  return shell(`<main id="main-content" aria-labelledby="page-title">
<h1 id="page-title">教育機関検索</h1>
<section class="sdb-prerender__panel" aria-label="教育機関検索フォーム">
<div class="sdb-prerender__fields">
<label>APIキー<input name="sdb-api-access-key" autocomplete="off" inputmode="text" placeholder="発行済み API キー" /></label>
<p>APIキーが未入力です。<a href="https://takumi-tokunaga.com/contact/">ポートフォリオのContactページ</a>から取得導線へ進んでください。</p>
<label>学校種別<select name="institutionType"><option>すべての学校種別</option></select></label>
<label>都道府県（任意）<input name="prefecture" placeholder="例: とうきょう / 大阪 / osaka" /></label>
<label>学校名<input name="school" placeholder="りつめいかん / ritsumeikan / 立命館" /></label>
<label>学部・研究科<select name="faculty"><option>先に学校を選択してください</option></select></label>
<label>学科<select name="department"><option>先に学部・研究科を選択してください</option></select></label>
</div>
</section>
</main>`);
}

function docPage(doc) {
  const body = marked.parse(doc.markdown, { async: false, gfm: true });
  return shell(`<main id="main-content" aria-labelledby="page-title">
<h1 id="page-title">${escapeHtml(doc.title.replace(" | sDB", ""))}</h1>
<p>${escapeHtml(doc.lead)}</p>
<article class="sdb-prerender__panel">${body}</article>
</main>`);
}

function pageHtml(template, title, body) {
  return template
    .replace(/<html lang="[^"]*">/, '<html lang="ja">')
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace("</head>", `${prerenderStyle()}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function writeRoute(route, html) {
  const outDir = route === "/" ? dist : path.join(dist, route.replace(/^\/|\/$/g, ""));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
}

if (!fs.existsSync(templatePath)) {
  throw new Error("dist/index.html was not found. Run vite build before prerender.");
}

const template = fs.readFileSync(templatePath, "utf8");
writeRoute("/", pageHtml(template, "sDB — 教育機関検索", home()));
for (const doc of Object.values(docs)) {
  const html = pageHtml(template, doc.title, docPage(doc));
  writeRoute(doc.route, html);
}
writeRoute("/sources/", pageHtml(template, docs.notices.title, docPage(docs.notices)));

console.log("Prerendered 5 static route(s).");

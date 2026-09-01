import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");
const [homeTemplate, styles, script] = await Promise.all([
  readText("index.html"), readText("styles.css"), readText("app.js"),
]);

// Reuse the exact reader markup on both routes; the app expands to all dialogues.
const sectionStart = homeTemplate.indexOf('      <section id="explorer"');
const sectionEnd = homeTemplate.indexOf('      <section id="results"');
assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
const footer = homeTemplate.match(/    <footer>[\s\S]*?<\/footer>/)?.[0];
assert.ok(footer);
const corpusTemplate = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Browse all MapTask dialogues & annotations · GMMT × SINS</title>
  <meta name="description" content="Explore all 128 MapTask dialogues, 16 map pairs and 13,077 GMMT reference annotations, with saved SINS matching judgments." />
  <meta property="og:title" content="GMMT × SINS · Full corpus browser" />
  <meta property="og:description" content="128 dialogues, 16 map pairs and 13,077 perspectivist annotations. Follow each reference in its complete dialogue." />
  <link rel="canonical" href="https://chnln.github.io/maptask-vis/explorer.html" />
  <meta property="og:url" content="https://chnln.github.io/maptask-vis/explorer.html" />
  <link rel="stylesheet" href="./styles.css" />
  <script type="module" src="./app.js"></script>
</head><body class="corpus-page" data-view="corpus">
  <a class="skip-link" href="#explorer">Skip to the corpus browser</a>
  <header class="site-header"><a class="site-mark" href="./index.html">GMMT × SINS</a><nav aria-label="Project navigation"><a href="./index.html">← Project home</a></nav></header>
  <main id="top"><section class="corpus-intro page-width"><h1>Browse the Complete MapTask Corpus</h1><p>Explore all 128 dialogues from the giver's and follower's perspectives. Select a map and dialogue, then follow each reference through the transcript, maps, GMMT annotations, and saved SINS judgments.</p><p><strong>128 dialogues · 16 map pairs · 13,077 annotations.</strong> GPT-5 annotations cover the full corpus and are selected by default. Human-verified annotations are available only for q1ec2, q1nc3 and q1nc7 (504 references). Every visible landmark has a clickable region, including landmarks not mentioned in the selected dialogue.</p><p><a href="./index.html#understanding-states-title">What do aligned, pending and misunderstood mean?</a></p></section>
  ${homeTemplate.slice(sectionStart, sectionEnd)}
  </main>${footer}
  <noscript>The corpus browser needs JavaScript. Download the datasets from the project homepage to inspect them separately.</noscript>
</body></html>`;
await writeFile(new URL("explorer.html", root), corpusTemplate);

async function buildPreview(template, dataFile, outputName) {
const json = {};
for (const filename of [dataFile, "hotspots.json"]) {
  json[`./data/${filename}`] = JSON.parse(await readText(`data/${filename}`));
}

const mapNames = new Set(json[`./data/${dataFile}`].demos.flatMap((demo) =>
  ["g", "f"].map((side) => `map${demo.mapId.slice(1)}${side}.png`),
));
const staticImages = [...template.matchAll(/src="\.\/static\/images\/maps\/([^"]+)"/g)];
for (const match of staticImages) mapNames.add(match[1]);

const images = {};
const hashes = {};
for (const filename of mapNames) {
  assert.match(filename, /^map\d+[gf]\.png$/);
  const bytes = await readFile(new URL(`static/images/maps/${filename}`, root));
  images[filename] = `data:image/png;base64,${bytes.toString("base64")}`;
  hashes[filename] = createHash("sha256").update(bytes).digest("hex");
}
if (dataFile === "corpus-data.json") await writeFile(new URL("data/map-image-hashes.json", root), `${JSON.stringify(hashes, null, 2)}\n`);

// Escape HTML raw-text terminators, including any that occur inside data strings.
const payload = JSON.stringify({ json, images }).replaceAll("<", "\\u003c");
const safeScript = script.replace(/<\/script/gi, "<\\/script");
const safeStyles = styles.replace(/<\/style/gi, "<\\/style");
function replaceOnce(html, needle, replacement) {
  assert.equal(html.split(needle).length, 2, `Expected exactly one ${needle}`);
  return html.replace(needle, () => replacement);
}

let html = replaceOnce(template, '<link rel="stylesheet" href="./styles.css" />', `<style>\n${safeStyles}\n</style>`);
html = replaceOnce(html, '<script type="module" src="./app.js"></script>', "");
html = html.replaceAll('href="./explorer.html', 'href="./explorer-preview.html').replaceAll('href="./index.html', 'href="./preview.html');
for (const [original, filename] of staticImages) {
  html = html.replace(original, () => `src="${images[filename]}"`);
}
// Execute at the end of the body: no imports, HTTP requests, or local module loading.
html = replaceOnce(html, "</body>", `<script id="embedded-preview-data" type="application/json">${payload}</script>\n<script>\n${safeScript}\n</script>\n  </body>`);

// Keep attribution available even if this file is moved away from the source tree.
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const notices = [];
for (const filename of ["CREDITS.md", "NOTICE.md"]) {
  const id = `preview-${filename.split(".")[0].toLowerCase()}`;
  html = html.replaceAll(`href="./${filename}"`, `href="#${id}"`);
  notices.push(`<details id="${id}" class="narrow-width" style="margin:1.5rem auto;padding:1rem"><summary>${filename === "CREDITS.md" ? "Source credits" : "License notices"}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit">${escapeHtml(await readText(filename))}</pre></details>`);
}
html = replaceOnce(html, "</footer>", `</footer>\n${notices.join("\n")}`);
assert.doesNotMatch(html, /(?:src|href)="\.\/(?!explorer-preview\.html|preview\.html)/, "Preview still contains a non-page local dependency");
assert.doesNotMatch(styles, /@import\b|url\(\s*["']?(?!data:|#)/i, "Styles need additional asset bundling");

const output = new URL(outputName, root);
await writeFile(output, html);
console.log(`Generated ${output.pathname}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, ${mapNames.size} maps. Open directly in a browser; no server needed.`);
}

await buildPreview(homeTemplate, "demo-data.json", "preview.html");
await buildPreview(corpusTemplate, "corpus-data.json", "explorer-preview.html");

import assert from "node:assert/strict";
import { copyFile, lstat, mkdir, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

// Publish only these files, never the repository root or private/local inputs.
const root = new URL("../", import.meta.url);
const output = new URL("_site/", root);
const files = [
  "index.html", "explorer.html", "styles.css", "app.js", ".nojekyll",
  "LICENSE", "NOTICE.md", "CREDITS.md", "CITATION.bib",
  "data/demo-data.json", "data/corpus-data.json", "data/hotspots.json",
  "data/map-image-hashes.json",
  ...Array.from({ length: 16 }, (_, map) => ["g", "f"].map((side) =>
    `static/images/maps/map${map}${side}.png`)).flat(),
];

async function listFiles(directory, prefix = "") {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const paths = [];
  for (const entry of entries) {
    assert.ok(!entry.isSymbolicLink(), `No symbolic links in deployment: ${prefix}${entry.name}`);
    if (entry.isDirectory()) paths.push(...await listFiles(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`));
    else {
      assert.ok(entry.isFile(), `Not a regular file: ${prefix}${entry.name}`);
      paths.push(`${prefix}${entry.name}`);
    }
  }
  return paths;
}

// Fail rather than delete unexpected local files or silently publish stale files.
for (const file of await listFiles(output)) assert.ok(files.includes(file), `Unexpected file in _site/: ${file}`);
for (const file of files) {
  const source = new URL(file, root);
  const target = new URL(file, output);
  assert.ok((await lstat(source)).isFile(), `Missing regular source file: ${file}`);
  await mkdir(new URL("./", target), { recursive: true });
  await copyFile(source, target);
}
assert.deepEqual((await listFiles(output)).sort(), [...files].sort());

// Check the published pages' relative links against the exact deployment bundle.
for (const page of ["index.html", "explorer.html"]) {
  const html = await readFile(new URL(page, output), "utf8");
  assert.doesNotMatch(html, /https:\/\/gmmt-vis\.github\.io/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/, "Use subpath-safe relative asset URLs");
  for (const [, href] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)(?:#[^"]*)?"/g)) {
    assert.ok(files.includes(href.slice(2)), `${page}: missing local link ${href}`);
  }
}
const hashes = JSON.parse(await readFile(new URL("data/map-image-hashes.json", output), "utf8"));
assert.equal(Object.keys(hashes).length, 32);
for (const [name, expected] of Object.entries(hashes)) {
  const bytes = await readFile(new URL(`static/images/maps/${name}`, output));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, name);
}
console.log(`Prepared _site/: ${files.length} allowlisted files; relative links and all 32 map hashes checked.`);

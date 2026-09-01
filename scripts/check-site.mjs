import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");
// Verbatim RQ1–RQ3 from the Introduction of each paper (not summary questions).
const paperQuestions = {
  gmmt: [
    "Is it possible to develop a personal-interpretation annotation scheme to capture nuanced understanding states for REs in collaborative tasks like MapTask?",
    "Given conflicting personal interpretations, can we trace how understanding evolves across turns until the successful grounding?",
    "Can LLMs, under a schema-constrained protocol, reliably annotate personal interpretations; and how does their output inform future evaluation of (V)LLMs on grounded dialogue?",
  ],
  sins: [
    "Can large vision-language models (VLMs) capture personal interpretations of interlocutors toward the same reference expression in asymmetric dialogue?",
    "Which modality of information contributes more to VLMs' assessment of interpretation alignment?",
    "Do VLMs exhibit systematically different behaviours on different types of alignment and misalignment cases?",
  ],
};
for (const page of ["index.html", "preview.html"]) {
  for (const [paper, questions] of Object.entries(paperQuestions)) {
    const card = read(page).match(new RegExp(`<aside class="research-question ${paper}-questions"[\\s\\S]*?</aside>`));
    assert.ok(card, `${page}: ${paper} research questions`);
    assert.deepEqual([...card[0].matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]), questions, `${page}: verbatim ${paper} RQ1–RQ3`);
  }
}
const corpus = JSON.parse(read("data/corpus-data.json"));
const hotspots = JSON.parse(read("data/hotspots.json"));
const maps = [...new Map(corpus.demos.map((demo) => [demo.mapId, demo])).values()];
assert.equal(Object.keys(hotspots.maps).length, 16);
let regionCount = 0;
for (const demo of maps) for (const side of ["giver", "follower"]) {
  const regions = hotspots.maps[demo.mapId][side];
  const expectedIds = demo.landmarks.flatMap((landmark) => Array.from({ length: landmark[`${side}Count`] }, (_, index) =>
    `${landmark.id}${landmark.id === demo.multiplicity?.id ? `#${side === "giver" ? index : demo.multiplicity.common.ordinal}` : ""}@${side[0]}`));
  assert.deepEqual(regions.map((item) => item.id).sort(), expectedIds.sort(), `${demo.mapId} ${side}: complete physical coverage`);
  regionCount += regions.length;
  for (const region of regions) {
    assert.ok([region.x, region.y, region.w, region.h].every(Number.isFinite), region.id);
    assert.ok(region.w > 0 && region.h > 0 && region.x - region.w / 2 >= 0 && region.x + region.w / 2 <= 100 && region.y - region.h / 2 >= 0 && region.y + region.h / 2 <= 100, region.id);
    // Sample each region's interior: no target may be completely occluded by smaller targets.
    const higher = regions.filter((other) => other !== region && other.w * other.h <= region.w * region.h);
    const exposed = Array.from({ length: 81 }, (_, i) => [region.x + (i % 9 - 4) * region.w / 10, region.y + (Math.floor(i / 9) - 4) * region.h / 10]).some(([x, y]) =>
      !higher.some((other) => Math.abs(x - other.x) < other.w / 2 && Math.abs(y - other.y) < other.h / 2));
    assert.ok(exposed, `${region.id}: independently clickable region`);
  }
}
assert.equal(regionCount, 431);
const counts = { aligned: 0, pending: 0, misunderstood: 0 };
for (const demo of corpus.demos) for (const ref of demo.references) counts[ref.annotations.gpt5.status]++;
assert.deepEqual(counts, { aligned: 9435, pending: 3403, misunderstood: 239 });
for (const [state, count] of Object.entries(counts)) {
  const card = read("index.html").match(new RegExp(`<article data-state="${state}">([\\s\\S]*?)</article>`))[1];
  assert.ok(card.includes(count.toLocaleString("en-US")));
  assert.ok(card.includes(`${(count / 13077 * 100).toFixed(1)}%`));
}
const corpusHeader = read("explorer.html").match(/<header\b[\s\S]*?<\/header>/)[0];
const corpusNavigation = corpusHeader.match(/<nav\b[\s\S]*?<\/nav>/)[0];
assert.equal([...corpusNavigation.matchAll(/<a\b/g)].length, 1);
assert.match(corpusNavigation, /Project home/);
assert.doesNotMatch(corpusNavigation, /SINS findings|Datasets/);
for (const page of ["explorer.html", "explorer-preview.html"]) {
  const intro = read(page).match(/<section class="corpus-intro page-width">([\s\S]*?)<\/section>/)[1];
  assert.match(intro, /<h1>Browse the Complete MapTask Corpus<\/h1>/);
  assert.match(intro, /giver's and follower's perspectives/);
  assert.doesNotMatch(intro, /Complete corpus browser|Every dialogue\. Both perspectives\.|section-number/);
}
for (const page of ["index.html", "explorer.html", "preview.html", "explorer-preview.html"]) {
  assert.match(read(page), /NLP Group, Department of Information and Computing Sciences, Utrecht University/, `${page}: correct affiliation`);
  assert.doesNotMatch(read(page), /Institute for Language Sciences|ICS \/ NLP/, `${page}: no superseded affiliation`);
  assert.equal([...read(page).matchAll(/<dialog id="map-zoom-dialog"/g)].length, 1, page);
}
assert.equal(corpus.demos.length, 128);
assert.equal(new Set(corpus.demos.map((d) => d.mapId)).size, 16);
assert.equal(corpus.demos.reduce((n, d) => n + d.references.length, 0), 13077);
assert.equal(corpus.demos.filter((d) => d.humanVerified).reduce((n, d) => n + d.references.length, 0), 504);
let checkedSpans = 0;
let displayCorrections = 0;
let excludedTimedUnits = 0;
const correctedDialogues = new Set();
for (const demo of corpus.demos) {
  for (const side of ["g", "f"]) assert.ok(existsSync(new URL(`static/images/maps/map${demo.mapId.slice(1)}${side}.png`, root)));
  const ids = new Set(demo.references.map((ref) => ref.id));
  assert.equal(ids.size, demo.references.length);
  for (const turn of demo.turns) for (const span of turn.spans) {
    assert.ok(ids.has(span.id));
    assert.ok(span.start >= 0 && span.end > span.start && span.end <= turn.text.length);
    checkedSpans++;
  }
  for (const ref of demo.references) {
    const anchors = demo.turns.flatMap((turn) => turn.spans.filter((span) => span.id === ref.id).map((span) => ({ text: turn.text.slice(span.start, span.end), speaker: turn.speaker, utteranceId: turn.utteranceId })));
    assert.equal(anchors.map((span) => span.text).join(" "), ref.expression, ref.id);
    assert.ok(anchors.every((span) => span.speaker === ref.speaker), `${ref.id}: transcript anchors must belong to the reference speaker`);
    assert.equal(anchors[0].speaker, ref.speaker, ref.id);
    assert.equal(anchors[0].utteranceId, ref.utteranceId, ref.id);
    if (ref.displayCorrection) {
      displayCorrections++;
      excludedTimedUnits += ref.displayCorrection.excludedTimedUnits.length;
      correctedDialogues.add(demo.dialogueId);
      assert.equal(ref.displayCorrection.type, "cross-speaker-timed-units");
      assert.notEqual(ref.releasedExpression, ref.expression);
      assert.ok(ref.displayCorrection.excludedTimedUnits.every((unit) => unit.speaker !== ref.speaker));
    }
    assert.equal(ref.sins.gold, ref.annotations.gpt5.status === "aligned" ? "Yes" : "No");
    assert.equal(Boolean(ref.annotations.human), demo.humanVerified);
  }
}
assert.equal(displayCorrections, 468);
assert.equal(excludedTimedUnits, 706);
assert.equal(correctedDialogues.size, 105);
const q1nc6Ref25 = corpus.demos.find((demo) => demo.dialogueId === "q1nc6").references.find((ref) => ref.id === "q1nc6.ref.25");
assert.equal(q1nc6Ref25.expression, "green bay");
assert.equal(q1nc6Ref25.releasedExpression, "green on the bay");

// A dependency-free DOM stub checks rendering and control handlers, not browser layout.
function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}
class Element {
  constructor(attrs = {}) {
    this.attrs = attrs;
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-")).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]));
    this.listeners = {};
    const classes = new Set((attrs.class ?? "").split(" "));
    this.classList = { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); }, toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); } };
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.open = false;
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this.attrs[name] = value; }
  closest() { return null; }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.fire("close"); }
  querySelectorAll(selector) {
    if (this.buttonHTML !== this.innerHTML) {
      this.buttonHTML = this.innerHTML;
      this.buttons = [...this.innerHTML.matchAll(/<button\b([^>]*)>/g)].map((match) => new Element(attributes(match[1])));
    }
    return this.buttons.filter((node) => selector === "button" || (selector.startsWith(".") ? (node.attrs.class ?? "").split(" ").includes(selector.slice(1)) : selector === "button[data-reference-id]" && node.attrs["data-reference-id"]));
  }
  fire(name, values = {}) { this.listeners[name]?.({ target: this, preventDefault() {}, ...values }); }
}

async function loadPage(name, hash = "") {
  const html = read(name);
  const payloadText = html.match(/<script id="embedded-preview-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  const payload = JSON.parse(payloadText);
  for (const dataUrl of Object.values(payload.images)) assert.equal(Buffer.from(dataUrl.split(",")[1], "base64").subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length, 1);
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  const nodes = new Map([...markup.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)].map((m) => [m[1], new Element(attributes(m[0]))]));
  const sources = [...markup.matchAll(/<button[^>]+data-source="[^"]+"[^>]*>/g)].map((m) => new Element(attributes(m[0])));
  const tabs = [...markup.matchAll(/<button[^>]+data-discrepancy="[^"]+"[^>]*>/g)].map((m) => new Element(attributes(m[0])));
  const classes = new Map();
  const embedded = new Element(); embedded.textContent = payloadText;
  const location = { hash };
  let fetches = 0;
  const errors = [];
  const document = {
    body: new Element(name.startsWith("explorer") ? { "data-view": "corpus" } : {}),
    querySelector(selector) {
      if (selector === "#embedded-preview-data") return embedded;
      if (selector.startsWith("#")) return nodes.get(selector.slice(1)) ?? null;
      if (!classes.has(selector)) classes.set(selector, new Element());
      return classes.get(selector);
    },
    querySelectorAll(selector) { return selector === "[data-source]" ? sources : selector === "[data-discrepancy]" ? tabs : []; },
  };
  const context = vm.createContext({ document, location,
    history: { replaceState(_state, _title, value) { location.hash = value; } },
    window: { addEventListener() {} },
    requestAnimationFrame() {},
    console: { error(error) { errors.push(error); } },
    fetch() { fetches++; throw new Error("Standalone preview must not fetch"); },
  });
  vm.runInContext(inline[0][1], context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, []);
  assert.equal(fetches, 0);
  return { run: (code) => vm.runInContext(code, context), nodes, sources, tabs, location, payload };
}

const home = await loadPage("preview.html");
assert.equal(home.nodes.get("detail-id").textContent, "q8nc6.ref.2");
assert.match(home.nodes.get("giver-id").textContent, /parked_van#0@g/);
assert.match(home.nodes.get("follower-id").textContent, /parked_van#1@f/);
assert.equal(home.sources.find((button) => button.dataset.source === "human").disabled, true);
assert.deepEqual(home.sources.map((button) => button.dataset.source), ["gpt5", "human"]);
assert.equal(home.run("state.source"), "gpt5");
for (const tab of home.tabs) {
  tab.fire("click");
  assert.equal(tab.attrs["aria-selected"], "true");
  assert.match(home.nodes.get("discrepancy-panel").innerHTML, /data:image\/png;base64,/);
  const triggers = home.nodes.get("discrepancy-panel").querySelectorAll(".map-zoom-trigger");
  assert.equal(triggers.length, 2);
  for (const trigger of triggers) {
    trigger.fire("click");
    assert.equal(home.nodes.get("map-zoom-dialog").open, true);
    assert.equal(home.run("document.body.classList.contains('map-zoom-open')"), true);
    const enlarged = home.nodes.get("map-zoom-image").innerHTML;
    const expectedRings = tab.dataset.discrepancy === "multiplicity" && trigger.dataset.side === "giver" ? 2 : 1;
    assert.equal([...enlarged.matchAll(/class="gallery-ring /g)].length, expectedRings);
    assert.doesNotMatch(enlarged, /<button\b/);
    assert.match(enlarged, /width:[\d.]+%;height:[\d.]+%/);
    home.nodes.get("map-zoom-image").fire("click");
    assert.equal(home.nodes.get("map-zoom-dialog").open, false);
    assert.equal(home.run("document.body.classList.contains('map-zoom-open')"), false);
  }
}
assert.equal(home.run("Object.values(discrepancyExamples).every(example => example.regions.flat().every(([x,y,w,h]) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100))"), true);
assert.match(home.run("discrepancyExamples.lexical.title"), /same icon\/position/);
assert.match(home.run("discrepancyExamples.existence.caption"), /The follower, who lacks this landmark/);
assert.match(home.run("discrepancyExamples.multiplicity.caption"), /farther from the route/);
assert.doesNotMatch(home.run("discrepancyExamples.multiplicity.caption"), /rearranged layout/);

function checkReaderZoom(page, mapId) {
  const selectedReference = page.nodes.get("detail-id").textContent;
  const triggers = page.nodes.get("map-pair").querySelectorAll(".map-zoom-trigger");
  assert.equal(triggers.length, 2);
  for (const trigger of triggers) {
    trigger.fire("click");
    assert.equal(page.nodes.get("map-zoom-dialog").open, true);
    assert.match(page.nodes.get("map-zoom-title").textContent, new RegExp(mapId));
    const image = page.nodes.get("map-zoom-image").innerHTML;
    const file = `map${mapId.slice(1)}${trigger.dataset.side === "giver" ? "g" : "f"}.png`;
    assert.ok(image.includes(page.payload.images[file]), "Zoom must use the selected map and side");
    assert.doesNotMatch(image, /<button\b/, "Enlarged overlays must not nest buttons");
    const expectedHotspots = page.run(`mapHotspots(currentDemo(), '${trigger.dataset.side}').length`);
    assert.equal([...image.matchAll(/class="map-hotspot\b/g)].length, expectedHotspots);
    page.nodes.get("map-zoom-close").fire("click");
    assert.equal(page.nodes.get("map-zoom-dialog").open, false);
  }
  triggers[0].fire("click");
  page.nodes.get("map-zoom-dialog").fire("click", { target: page.nodes.get("map-zoom-image") });
  assert.equal(page.nodes.get("map-zoom-dialog").open, true);
  page.nodes.get("map-zoom-dialog").fire("click");
  assert.equal(page.nodes.get("map-zoom-dialog").open, false);
  assert.equal(page.nodes.get("detail-id").textContent, selectedReference, "Zoom must not change the selected annotation");
}
for (let index = 0; index < 4; index++) {
  home.run(`chooseDialogue(${index})`);
  assert.equal(home.run("state.source"), "gpt5");
  if (index > 0) {
    home.sources.find((button) => button.dataset.source === "human").fire("click");
    assert.equal(home.run("state.source"), "human");
    home.run(`chooseDialogue(${index})`);
    assert.equal(home.run("state.source"), "gpt5", "A new example must default to GPT-5 even after inspecting human annotations");
  }
  checkReaderZoom(home, home.run("currentDemo().mapId"));
  const count = home.run("currentDemo().references.length");
  home.run(`selectReference(currentDemo().references[${count - 1}].id)`);
  assert.match(home.nodes.get("dialogue-excerpt").innerHTML, new RegExp(home.nodes.get("detail-id").textContent.replaceAll(".", "\\.")));
  assert.equal(home.nodes.get("anchor-note").hidden, true);
}
home.nodes.get("trace-search").value = "no-such-reference-xyz";
home.nodes.get("trace-search").fire("input");
assert.equal(home.nodes.get("reference-select").disabled, true);
home.nodes.get("trace-search").value = "";
home.nodes.get("trace-search").fire("input");
assert.equal(home.nodes.get("reference-select").disabled, false);
home.run("chooseDialogue(0); selectReference('q8nc6.ref.7')");
assert.equal(home.nodes.get("anchor-note").hidden, true);
home.nodes.get("next-ref").fire("click");
assert.equal(home.nodes.get("detail-id").textContent, "q8nc6.ref.8");

const full = await loadPage("explorer-preview.html", "#q8nc6.ref.2");
assert.equal(full.nodes.get("detail-id").textContent, "q8nc6.ref.2", "Deep link must survive initialization");
assert.equal(Object.keys(full.payload.images).length, 32);
assert.deepEqual(full.sources.map((button) => button.dataset.source), ["gpt5", "human"]);
for (let index = 0; index < corpus.demos.length; index++) {
  full.run(`chooseDialogue(${index})`);
  assert.equal(full.run("state.source"), "gpt5");
  const demo = corpus.demos[index];
  checkReaderZoom(full, demo.mapId);
  const transcript = full.nodes.get("dialogue-excerpt").innerHTML;
  for (const ref of demo.references) assert.ok(transcript.includes(`data-reference-id="${ref.id}"`), `${ref.id} must be individually clickable`);
  for (const source of demo.humanVerified ? ["human", "gpt5"] : ["gpt5"]) {
    full.run(`state.source='${source}'; selectReference(currentDemo().references.at(-1).id)`);
    assert.equal(full.nodes.get("anchor-note").hidden, !demo.references.at(-1).displayCorrection);
    assert.match(full.nodes.get("map-pair").innerHTML, /src="data:image\/png;base64,/);
    assert.equal(full.nodes.get("gold-judgment").textContent, demo.references.at(-1).sins.gold);
  }
}
full.run("chooseDialogue(state.data.demos.findIndex((demo) => demo.dialogueId === 'q1nc6')); selectReference('q1nc6.ref.25')");
assert.equal(full.nodes.get("detail-expression").textContent, "“green bay”");
assert.equal(full.nodes.get("anchor-note").hidden, false);
assert.match(full.nodes.get("anchor-note").textContent, /2 overlapping timed units/);
assert.doesNotMatch(full.nodes.get("dialogue-excerpt").innerHTML, /class="excerpt-turn giver is-active"/);
let clickedRegions = 0;
let unmentionedRegions = 0;
for (const demo of maps) {
  const index = corpus.demos.findIndex((item) => item.mapId === demo.mapId);
  full.run(`chooseDialogue(${index})`);
  for (const side of ["giver", "follower"]) for (const region of hotspots.maps[demo.mapId][side]) {
    const previousReference = full.nodes.get("detail-id").textContent;
    const button = full.nodes.get("map-pair").querySelectorAll(".map-hotspot").find((item) => item.dataset.landmarkId === region.id);
    assert.ok(button, `${region.id}: rendered button`);
    button.fire("click");
    clickedRegions++;
    assert.equal(full.run("state.selectedLandmark"), region.id);
    assert.equal(full.nodes.get("landmark-picker").open, true);
    const concept = full.run(`landmarkConceptId(${JSON.stringify(region.id)})`);
    const chip = full.nodes.get("landmark-list").querySelectorAll("button").find((item) => item.dataset.concept === concept);
    assert.equal(chip?.attrs["aria-pressed"], "true", `${region.id}: list selection`);
    assert.match(full.nodes.get("landmark-selection-label").textContent, /^Selected: /);
    const mentionCount = full.run(`referencesForLandmark(${JSON.stringify(region.id)}).length`);
    const mentions = full.nodes.get("landmark-mentions").querySelectorAll("button");
    assert.equal(mentions.length, mentionCount);
    if (!mentionCount) {
      unmentionedRegions++;
      assert.equal(full.nodes.get("detail-id").textContent, previousReference);
      assert.match(full.nodes.get("landmark-mentions").innerHTML, /not mentioned or inferred/);
    }
    chip.fire("click");
    assert.equal(full.run("state.selectedLandmark"), concept);
    const selectedMapButtons = full.nodes.get("map-pair").querySelectorAll(".map-hotspot").filter((item) => item.attrs["aria-pressed"] === "true");
    assert.ok(selectedMapButtons.some((item) => item.dataset.landmarkId === region.id), `${region.id}: list to map linkage`);
  }
}
assert.equal(clickedRegions, 431);
assert.ok(unmentionedRegions > 0, "Exercise clickable but unmentioned landmarks");
full.run("chooseDialogue(state.data.demos.findIndex(demo => demo.mapId === 'm6')); chooseLandmark('m6_fast_running_creek@f')");
assert.equal(full.run("landmarkConceptId(state.selectedLandmark)"), "m6_fast_flowing_river");
assert.match(full.nodes.get("landmark-selection-label").textContent, /fast flowing river \/ fast running creek/);
full.nodes.get("corpus-map").value = "m0";
full.nodes.get("corpus-map").fire("change");
full.nodes.get("corpus-dialogue").value = "q8nc6";
full.nodes.get("corpus-dialogue").fire("change");
full.run("chooseLandmark('m0_parked_van#0@g')");
assert.match(full.nodes.get("landmark-mentions").innerHTML, /q8nc6.ref.2/);
assert.equal(full.nodes.get("anchor-note").hidden, true);
full.run("state.selectedLandmark = null; renderExplorer()");
const transcriptReference = full.nodes.get("dialogue-excerpt").querySelectorAll("button[data-reference-id]").find((item) => item.dataset.referenceId === "q8nc6.ref.12");
assert.ok(transcriptReference, "Transcript reference is clickable");
transcriptReference.fire("click");
assert.equal(full.run("state.selectedLandmark"), "m0_parked_van", "Transcript reference selects its landmark concept");
const selectedMention = full.nodes.get("landmark-mentions").querySelectorAll("button").find((item) => item.dataset.ref === "q8nc6.ref.12");
assert.equal(selectedMention?.attrs["aria-pressed"], "true", "Transcript reference selects the matching mention");
const selectedConcept = full.nodes.get("landmark-list").querySelectorAll("button").find((item) => item.dataset.concept === "m0_parked_van");
assert.equal(selectedConcept?.attrs["aria-pressed"], "true", "Transcript reference selects the matching landmark chip");
console.log(`PASS: 128 dialogues / 13,077 references / ${checkedSpans} exact spans; ${clickedRegions} clickable landmark regions including ${unmentionedRegions} unmentioned cases; state counts, GPT-5 defaults, list/map/mention linkage, lexical aliases, both offline pages, deep links, four tabs, filters, navigation and map zoom/dismiss handlers. DOM-stub tests do not verify browser layout or native dialog keyboard behaviour.`);

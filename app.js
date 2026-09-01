// The standalone preview supplies these assets inline; the normal site uses files.
const embeddedPreviewElement = document.querySelector("#embedded-preview-data");
const embeddedPreview = embeddedPreviewElement ? JSON.parse(embeddedPreviewElement.textContent) : null;

const state = {
  full: document.body.dataset.view === "corpus",
  data: null,
  hotspots: null,
  demoIndex: 0,
  source: "gpt5",
  referenceId: "q8nc6.ref.2",
  query: "",
  status: "all",
  selectedLandmark: null,
};

const statusLabels = {
  aligned: "Aligned",
  pending: "Pending",
  misunderstood: "Misunderstood",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitInterpretations(value) {
  return value ? value.split("+").map((item) => item.trim()).filter(Boolean) : [];
}

function baseLandmarkId(value) {
  return value.replace(/@[gf]$/, "").replace(/#\d+$/, "");
}

function landmarkConceptId(value) {
  const base = baseLandmarkId(value);
  const pair = currentDemo().lexicalPairs.find((item) =>
    [item.landmark_giver_map, item.landmark_follower_map].includes(base));
  return pair?.landmark_giver_map ?? base;
}

function landmarkConceptLabel(value) {
  const id = landmarkConceptId(value);
  const pair = currentDemo().lexicalPairs.find((item) => item.landmark_giver_map === id);
  return pair
    ? `${readableLandmark(pair.landmark_giver_map)} / ${readableLandmark(pair.landmark_follower_map)}`
    : readableLandmark(id);
}

function referencesForLandmark(value) {
  const concept = landmarkConceptId(value);
  return currentDemo().references.filter((ref) =>
    landmarkConceptId(ref.conceptId) === concept
    || ["giver", "follower"].some((side) => splitInterpretations(ref.annotations[state.source][side])
      .some((id) => landmarkConceptId(id) === concept)));
}

function readableLandmark(value) {
  if (!value) return "Unresolved";
  const demo = state.data ? currentDemo() : null;
  return splitInterpretations(value).map((id) => {
    const hotspot = demo
      ? ["giver", "follower"].flatMap((side) => mapHotspots(demo, side)).find((item) => item.id === id)
      : null;
    if (hotspot) return hotspot.label.replace(" · upper", " · upper instance").replace(" · lower", " · lower instance");

    const name = baseLandmarkId(id).replace(/^m\d+_/, "").replaceAll("_", " ");
    const ordinal = id.match(/#(\d+)/)?.[1];
    if (ordinal !== undefined && demo?.multiplicity) {
      const position = [demo.multiplicity.common, demo.multiplicity.unique].find((item) => String(item.ordinal) === ordinal);
      if (position) return `${name} · ${position.absolute_position}`;
    }
    return ordinal === undefined ? name : `${name} · instance ${Number(ordinal) + 1}`;
  }).join(" + ");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function currentDemo() {
  return state.data.demos[state.demoIndex];
}

function currentReference() {
  const demo = currentDemo();
  return demo.references.find((reference) => reference.id === state.referenceId) ?? demo.references[0];
}

function currentAnnotation(reference = currentReference()) {
  return reference.annotations[state.source];
}

function visibleReferences() {
  const query = state.query.trim().toLowerCase();
  return currentDemo().references.filter((ref) =>
    (state.status === "all" || ref.annotations[state.source].status === state.status)
    && (!query || `${ref.id} ${ref.expression}`.toLowerCase().includes(query)),
  );
}

function mapHotspots(demo, side) {
  // Smaller landmarks sit above broad water/terrain regions where their boxes overlap.
  return [...(state.hotspots?.maps?.[demo.mapId]?.[side] ?? [])].sort((a, b) => b.w * b.h - a.w * a.h);
}

function hotspotIsActive(hotspot, annotation, side) {
  return splitInterpretations(annotation[side]).includes(hotspot.id);
}

function hotspotIsRelated(hotspot, annotation) {
  const hotspotBase = landmarkConceptId(hotspot.id);
  return ["giver", "follower"].some((side) =>
    splitInterpretations(annotation[side]).some((id) => landmarkConceptId(id) === hotspotBase),
  );
}

function hotspotMarkup(hotspot, annotation, side, interactive = true) {
  const active = hotspotIsActive(hotspot, annotation, side);
  const related = hotspotIsRelated(hotspot, annotation);
  const selected = hotspot.id === state.selectedLandmark || (state.selectedLandmark && !state.selectedLandmark.includes("@")
    && landmarkConceptId(hotspot.id) === landmarkConceptId(state.selectedLandmark));
  const classes = ["map-hotspot", side, active ? "is-active" : "", related ? "is-related" : "", selected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");
  const tag = interactive ? "button" : "span";

  return `
    <${tag}
      class="${classes}"
      style="--x:${Number(hotspot.x)}%;--y:${Number(hotspot.y)}%;--w:${Number(hotspot.w)}%;--h:${Number(hotspot.h)}%"
      ${interactive ? `type="button" data-landmark-id="${escapeHtml(hotspot.id)}" aria-label="Select ${escapeHtml(hotspot.label)}" title="${escapeHtml(hotspot.label)}" aria-pressed="${Boolean(selected)}"` : 'aria-hidden="true"'}
    >
      <span class="hotspot-ring" aria-hidden="true"></span>
      <span class="hotspot-label">${escapeHtml(hotspot.label)}</span>
    </${tag}>`;
}

function mapImageMarkup(mapId, side) {
  const filename = `map${mapId.slice(1)}${side === "giver" ? "g" : "f"}.png`;
  const src = embeddedPreview?.images[filename] ?? `./static/images/maps/${filename}`;
  return `<img class="real-map-image" src="${escapeHtml(src)}" alt="HCRC Map Task ${escapeHtml(mapId)} ${side} map" width="791" height="1024" />`;
}

function bindMapZoom(container) {
  container.querySelectorAll(".map-zoom-trigger").forEach((button) => {
    button.addEventListener("click", () => openMapZoom(button));
  });
}

function openMapZoom(button) {
  const { side, example } = button.dataset;
  const demo = currentDemo();
  const mapId = example ? discrepancyExamples[example].mapId : demo.mapId;
  const content = document.querySelector("#map-zoom-image");
  content.innerHTML = example
    ? discrepancyMapMarkup(example, side)
    : `${mapImageMarkup(mapId, side)}<span class="hotspot-layer" aria-hidden="true">${mapHotspots(demo, side).map((hotspot) => hotspotMarkup(hotspot, currentAnnotation(), side, false)).join("")}</span>`;
  document.querySelector("#map-zoom-title").textContent = `${titleCase(side)} · Map ${mapId}`;
  document.querySelector("#map-zoom-dialog").showModal();
  document.body.classList.add("map-zoom-open");
}

function bindMapZoomDialog() {
  const dialog = document.querySelector("#map-zoom-dialog");
  for (const id of ["#map-zoom-image", "#map-zoom-close"]) {
    document.querySelector(id).addEventListener("click", () => dialog.close());
  }
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => document.body.classList.remove("map-zoom-open"));
}

function renderMapCard(demo, side, annotation) {
  const isGiver = side === "giver";
  const sideCode = isGiver ? "g" : "f";
  const filename = `map${demo.mapId.slice(1)}${sideCode}.png`;
  const hotspots = mapHotspots(demo, side);

  return `
    <article class="map-card ${side}">
      <div class="map-card-heading">
        <span><i></i> ${isGiver ? "Giver" : "Follower"}</span>
        <small>${escapeHtml(filename)} · ${hotspots.length} clickable landmarks</small>
      </div>
      <div class="real-map-wrap">
        <button class="map-zoom-trigger" type="button" data-side="${side}" aria-haspopup="dialog" aria-label="Enlarge ${side} map" title="Click to enlarge map">
          ${mapImageMarkup(demo.mapId, side)}
        </button>
        <div class="hotspot-layer" aria-label="Clickable landmark overlay">
          ${hotspots.map((hotspot) => hotspotMarkup(hotspot, annotation, side)).join("")}
        </div>
      </div>
    </article>`;
}

function renderMapPair() {
  const demo = currentDemo();
  const annotation = currentAnnotation();
  const container = document.querySelector("#map-pair");
  if (!container) return;

  container.innerHTML = [
    renderMapCard(demo, "giver", annotation),
    renderMapCard(demo, "follower", annotation),
  ].join("");

  container.querySelectorAll(".map-hotspot").forEach((button) => {
    button.addEventListener("click", () => chooseLandmark(button.dataset.landmarkId));
  });
  bindMapZoom(container);
  const activeIds = [annotation.giver, annotation.follower].flatMap(splitInterpretations);
  const positioned = ["giver", "follower"].flatMap((side) => mapHotspots(demo, side)).map((item) => item.id);
  const missing = activeIds.filter((id) => !positioned.includes(id));
  document.querySelector("#overlay-note").textContent = missing.length
    ? "Some source annotation IDs do not correspond to visible landmarks on these maps. Their original IDs remain visible in the interpretation cards."
    : "Blue = giver interpretation; coral = follower interpretation; gold = your selected landmark. Every visible landmark is clickable.";
  renderLandmarkPicker();
}

function renderLandmarkPicker() {
  const demo = currentDemo();
  const selectedConcept = state.selectedLandmark ? landmarkConceptId(state.selectedLandmark) : null;
  const concepts = [...new Set([...demo.landmarks.map((landmark) => landmark.id), ...demo.references.map((ref) => ref.conceptId)].map(landmarkConceptId))];
  const list = document.querySelector("#landmark-list");
  list.innerHTML = concepts.map((id) => `<button type="button" data-concept="${escapeHtml(id)}" aria-pressed="${id === selectedConcept}">${escapeHtml(landmarkConceptLabel(id))}</button>`).join("");
  list.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => chooseLandmark(button.dataset.concept)));
  document.querySelector("#landmark-selection-label").textContent = selectedConcept ? `Selected: ${landmarkConceptLabel(selectedConcept)}` : "";
  const mentions = document.querySelector("#landmark-mentions");
  const related = state.selectedLandmark ? referencesForLandmark(state.selectedLandmark) : [];
  const scope = selectedConcept === demo.multiplicity?.id ? " · all instances" : "";
  mentions.innerHTML = selectedConcept ? `<p>Mentions of <strong>${escapeHtml(landmarkConceptLabel(selectedConcept))}</strong> · ${related.length} references${scope}</p>${related.length ? related.map((ref) => `<button type="button" data-ref="${ref.id}" aria-pressed="${ref.id === state.referenceId}">${escapeHtml(ref.expression)} <small>${ref.id.split(".").at(-1)}</small></button>`).join("") : "<p>This landmark is not mentioned or inferred in this dialogue's selected annotation layer. The previous reference remains selected.</p>"}` : "";
  mentions.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => selectReference(button.dataset.ref)));
}

function chooseLandmark(landmarkId) {
  const demo = currentDemo();
  const side = landmarkId.endsWith("@g") ? "giver" : "follower";
  const directMatch = demo.references.find((reference) =>
    splitInterpretations(reference.annotations[state.source][side]).includes(landmarkId),
  );
  state.selectedLandmark = landmarkId;
  state.referenceId = (directMatch ?? referencesForLandmark(landmarkId)[0] ?? currentReference()).id;
  document.querySelector("#landmark-picker").open = true;
  state.query = "";
  state.status = "all";
  const search = document.querySelector("#trace-search");
  const filter = document.querySelector("#status-filter");
  if (search) search.value = "";
  if (filter) filter.value = "all";
  renderExplorer();
  scrollActiveTraceIntoView();
}

function selectReference(id) {
  const reference = currentDemo().references.find((ref) => ref.id === id);
  if (!reference) return;
  const belongsToSelectedLandmark = state.selectedLandmark
    && referencesForLandmark(state.selectedLandmark).some((ref) => ref.id === id);
  state.referenceId = id;
  if (!belongsToSelectedLandmark) state.selectedLandmark = landmarkConceptId(reference.conceptId);
  if (!visibleReferences().some((ref) => ref.id === id)) resetFilters();
  renderExplorer();
  scrollActiveTraceIntoView();
  scrollActiveMentionIntoView();
}

function renderTrace() {
  const demo = currentDemo();
  const visible = visibleReferences();

  const count = document.querySelector("#trace-count");
  const list = document.querySelector("#reference-select");
  if (!list) return;
  if (count) count.textContent = `${visible.length} / ${demo.references.length} references`;

  list.innerHTML = visible.length ? visible.map((ref) => `<option value="${ref.id}">${ref.id.split(".").at(-1)} · ${escapeHtml(ref.expression)} · ${statusLabels[ref.annotations[state.source].status]}</option>`).join("") : '<option value="">No matching references · clear the filters</option>';
  list.value = state.referenceId;
  list.disabled = !visible.length;
  document.querySelector("#dialogue-help").textContent = !visible.length
    ? "No references match these filters. Clear the search or change the state; the previous reference is still displayed below."
    : "Filters narrow the reference picker, not the transcript. Highlighted words and ref. IDs identify the selected reference. G = giver; F = follower. Line numbers preserve the transcript's order.";
  const index = visible.findIndex((ref) => ref.id === state.referenceId);
  document.querySelector("#previous-ref").disabled = index <= 0;
  document.querySelector("#next-ref").disabled = index < 0 || index === visible.length - 1;
}

function renderDialogueExcerpt() {
  const container = document.querySelector("#dialogue-excerpt");
  if (!container) return;
  const demo = currentDemo();
  const selectedIndex = demo.turns.findIndex((turn) => turn.refIds.includes(state.referenceId));
  const first = state.full ? 0 : Math.max(0, selectedIndex - 5);
  const last = state.full ? demo.turns.length : Math.min(demo.turns.length, selectedIndex + 8);
  const turns = demo.turns.slice(first, last);
  container.innerHTML = `
    <div class="excerpt-heading">
      <span>${state.full ? "Complete transcript" : "Context around the selected reference"}</span>
      <small>Lines ${first + 1}–${last} / ${demo.turns.length}</small>
    </div>
    ${state.full ? "" : '<p class="excerpt-window-note">Up to 5 transcript lines before and 7 after the selected reference. Choose another phrase to move the window.</p>'}
    <div class="excerpt-turns">
      ${turns.map((turn) => {
        const selected = turn.refIds.includes(state.referenceId);
        // Split overlapping/nested spans into non-nested clickable text segments.
        const boundaries = [...new Set([0, turn.text.length, ...turn.spans.flatMap((span) => [span.start, span.end])])].sort((a, b) => a - b);
        const markedText = boundaries.slice(0, -1).map((start, i) => {
          const end = boundaries[i + 1];
          const covering = turn.spans.filter((span) => span.start <= start && span.end >= end);
          const span = covering.find((item) => item.id === state.referenceId) ?? covering[0];
          const text = escapeHtml(turn.text.slice(start, end));
          return span ? `<button type="button" class="reference-token ${span.id === state.referenceId ? "is-active" : ""}" data-reference-id="${span.id}" aria-pressed="${span.id === state.referenceId}" title="${span.id}">${text}</button>` : text;
        }).join("");
        return `
          <div class="excerpt-turn ${turn.speaker} ${selected ? "is-active" : ""}">
            <span class="excerpt-speaker">${turn.speaker === "giver" ? "G" : "F"}</span>
            <span class="excerpt-text">${markedText}<span class="turn-reference-ids">${turn.refIds.map((id) => `<button type="button" data-reference-id="${id}" class="${id === state.referenceId ? "is-active" : ""}" aria-label="Select ${id}" aria-pressed="${id === state.referenceId}">ref.${id.split(".").at(-1)}</button>`).join("")}</span></span>
            <small>line ${turn.lineNumber}<br />utt ${turn.utteranceId}</small>
          </div>`;
      }).join("")}
    </div>`;

  container.querySelectorAll("button[data-reference-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectReference(button.dataset.referenceId);
    });
  });
}

function applyJudgmentStyle(element, value, gold = null) {
  if (!element) return;
  element.textContent = value ?? "—";
  const card = element.closest("article");
  if (!card) return;
  card.classList.remove("yes", "no", "wrong");
  if (value) card.classList.add(value.toLowerCase());
  if (gold && value && value !== gold) card.classList.add("wrong");
}

function renderDetail() {
  const reference = currentReference();
  const annotation = currentAnnotation(reference);
  const giverIds = splitInterpretations(annotation.giver);
  const followerIds = splitInterpretations(annotation.follower);
  const resolved = giverIds.length > 0 && followerIds.length > 0;

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };
  setText("#detail-id", reference.id);
  setText("#detail-expression", `“${reference.expression}”`);
  setText("#detail-speaker", `${titleCase(reference.speaker)} · utterance ${reference.utteranceId}`);

  const status = document.querySelector("#detail-status");
  if (status) {
    status.textContent = statusLabels[annotation.status];
    status.className = `status-pill ${annotation.status}`;
  }

  setText("#giver-interpretation", titleCase(readableLandmark(annotation.giver)));
  setText("#follower-interpretation", titleCase(readableLandmark(annotation.follower)));
  setText("#giver-id", annotation.giver || "unresolved");
  setText("#follower-id", annotation.follower || "unresolved");

  const symbol = document.querySelector("#comparison-symbol");
  if (symbol) {
    symbol.textContent = annotation.status === "aligned" ? "=" : resolved ? "≠" : "?";
    symbol.setAttribute("aria-label", annotation.status === "aligned" ? "Same interpretation" : resolved ? "Different interpretations" : "Unresolved interpretation");
  }

  setText("#annotation-source-label", state.source === "human"
    ? "Human-verified annotation"
    : "GPT-5 · structured annotation");
  setText("#status-explanation", {
    aligned: "Both participants are annotated as grounding this reference to the same or equivalent landmark.",
    pending: "Grounding is not established in the annotation cascade. An existence check is also classified as pending.",
    misunderstood: "Both have grounded the reference, but to different landmarks."
  }[annotation.status]);
  const fields = { subtype: annotation.subtype, ...annotation.cascade };
  document.querySelector("#annotation-fields").innerHTML = `<dl>${Object.entries(fields).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value === null ? "null · not evaluated" : String(value))}</dd></div>`).join("")}</dl>`;
  setText("#annotation-reason", annotation.reason || "No rationale was provided in this annotation source.");
  const anchors = currentDemo().turns.flatMap((turn) => turn.spans.filter((span) => span.id === reference.id).map((span) => ({ text: turn.text.slice(span.start, span.end), speaker: turn.speaker, utteranceId: turn.utteranceId })));
  const transcriptText = anchors.map((span) => span.text).join(" ");
  const differs = transcriptText.replace(/\s+/g, " ").trim() !== reference.expression.replace(/\s+/g, " ").trim()
    || anchors[0]?.speaker !== reference.speaker || anchors[0]?.utteranceId !== reference.utteranceId;
  const note = document.querySelector("#anchor-note");
  const correction = reference.displayCorrection;
  note.hidden = !correction && !differs;
  note.textContent = correction
    ? `Display correction: ${correction.excludedTimedUnits.length} overlapping timed unit${correction.excludedTimedUnits.length === 1 ? "" : "s"} from the other speaker ${correction.excludedTimedUnits.length === 1 ? "was" : "were"} excluded from the released expression “${reference.releasedExpression}”. The interpretation annotation is unchanged.`
    : differs ? `Source alignment note: the transcript anchor reads “${transcriptText}” (first segment: ${anchors[0]?.speaker}, utt ${anchors[0]?.utteranceId}). The released annotation names “${reference.expression}” (${reference.speaker}, utt ${reference.utteranceId}). Both are shown as supplied; no source record has been silently corrected.` : "";

  applyJudgmentStyle(document.querySelector("#gold-judgment"), reference.sins.gold);
  applyJudgmentStyle(document.querySelector("#text-judgment"), reference.sins.predictions.textOnly, reference.sins.gold);
  applyJudgmentStyle(document.querySelector("#maps-judgment"), reference.sins.predictions.bothMaps, reference.sins.gold);
}

function featuredReference(demo) {
  const preferredByMap = {
    m0: "q8nc6.ref.2",
    m9: "q1ec2.ref.7",
    m6: "q1nc3.ref.21",
    m12: "q1nc7.ref.34",
  };
  return demo.references.find((reference) => reference.id === preferredByMap[demo.mapId])
    ?? demo.references.find((reference) => reference.annotations.gpt5.status === "misunderstood")
    ?? demo.references[0];
}

function renderMapSwitcher() {
  const switcher = document.querySelector("#map-switcher");
  if (!switcher) return;
  switcher.hidden = state.full;
  document.querySelector(".corpus-selectors").hidden = !state.full;
  if (state.full) {
    const maps = [...new Set(state.data.demos.map((demo) => demo.mapId))];
    const mapSelect = document.querySelector("#corpus-map");
    mapSelect.innerHTML = maps.map((map) => `<option value="${map}">Map ${map.slice(1)}</option>`).join("");
    mapSelect.value = currentDemo().mapId;
    const dialogueSelect = document.querySelector("#corpus-dialogue");
    dialogueSelect.innerHTML = state.data.demos.filter((demo) => demo.mapId === currentDemo().mapId).map((demo) => `<option value="${demo.dialogueId}">${demo.dialogueId} · ${demo.references.length} references${demo.humanVerified ? " · human-verified" : ""}</option>`).join("");
    dialogueSelect.value = currentDemo().dialogueId;
    return;
  }
  switcher.innerHTML = state.data.demos.map((demo, index) => `
    <button type="button" class="${index === state.demoIndex ? "is-active" : ""}" data-demo-index="${index}" aria-pressed="${index === state.demoIndex}">
      <span>${escapeHtml(demo.mapId)}</span>
      <small>${escapeHtml(demo.focus)}</small>
    </button>`).join("");

  switcher.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      chooseDialogue(Number(button.dataset.demoIndex));
    });
  });
}

function resetFilters() {
  state.query = "";
  state.status = "all";
  document.querySelector("#trace-search").value = "";
  document.querySelector("#status-filter").value = "all";
}

function chooseDialogue(index, referenceId = null) {
  state.demoIndex = index;
  state.source = "gpt5";
  state.referenceId = referenceId ?? featuredReference(currentDemo()).id;
  state.selectedLandmark = null;
  document.querySelector("#landmark-picker").open = false;
  resetFilters();
  renderExplorer();
  scrollActiveTraceIntoView();
}

function renderExplorer() {
  const demo = currentDemo();
  if (!demo.humanVerified) state.source = "gpt5";
  document.querySelectorAll("[data-source]").forEach((button) => {
    const active = button.dataset.source === state.source;
    button.disabled = button.dataset.source === "human" && !demo.humanVerified;
    button.title = button.disabled ? "This dialogue is not in the human-verified subset" : "";
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const currentMap = document.querySelector("#current-map-id");
  const currentDialogue = document.querySelector("#current-dialogue-id");
  if (currentMap) currentMap.textContent = demo.mapId;
  if (currentDialogue) currentDialogue.textContent = demo.dialogueId;
  renderMapSwitcher();
  renderMapPair();
  renderDialogueExcerpt();
  renderTrace();
  renderDetail();
  const browse = document.querySelector("#browse-corpus");
  if (browse) browse.href = `./${embeddedPreview ? "explorer-preview.html" : "explorer.html"}#${state.referenceId}`;
  if (state.full) history.replaceState(null, "", `#${state.referenceId}`);
}

function scrollActiveTraceIntoView() {
  requestAnimationFrame(() => {
    const activeItem = document.querySelector(".excerpt-turn.is-active");
    const traceList = document.querySelector("#dialogue-excerpt");
    if (!activeItem || !traceList) return;
    const delta = activeItem.getBoundingClientRect().top - traceList.getBoundingClientRect().top;
    traceList.scrollTop += delta - (traceList.clientHeight - activeItem.clientHeight) / 2;
  });
}

function scrollActiveMentionIntoView() {
  requestAnimationFrame(() => {
    const activeItem = document.querySelector('.landmark-mentions button[aria-pressed="true"]');
    const mentionList = document.querySelector("#landmark-mentions");
    if (!activeItem || !mentionList) return;
    const delta = activeItem.getBoundingClientRect().top - mentionList.getBoundingClientRect().top;
    mentionList.scrollTop += delta - (mentionList.clientHeight - activeItem.clientHeight) / 2;
  });
}

function bindCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(`#${CSS.escape(button.dataset.copyTarget)}`);
      if (!target) return;
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select citation";
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setTimeout(() => { button.textContent = original; }, 1800);
    });
  });
}

function bindControls() {
  document.querySelectorAll("[data-source]").forEach((button) => {
    button.addEventListener("click", () => {
      state.source = button.dataset.source;
      resetFilters();
      renderExplorer();
    });
  });

  document.querySelector("#trace-search")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyReferenceFilter();
  });

  document.querySelector("#status-filter")?.addEventListener("change", (event) => {
    state.status = event.target.value;
    applyReferenceFilter();
  });

  document.querySelector("#reference-select").addEventListener("change", (event) => selectReference(event.target.value));
  for (const [id, direction] of [["#previous-ref", -1], ["#next-ref", 1]]) {
    document.querySelector(id).addEventListener("click", () => {
      const visible = visibleReferences();
      const index = visible.findIndex((ref) => ref.id === state.referenceId);
      if (visible[index + direction]) selectReference(visible[index + direction].id);
    });
  }
  document.querySelector("#corpus-map").addEventListener("change", (event) => chooseDialogue(state.data.demos.findIndex((demo) => demo.mapId === event.target.value)));
  document.querySelector("#corpus-dialogue").addEventListener("change", (event) => chooseDialogue(state.data.demos.findIndex((demo) => demo.dialogueId === event.target.value)));
  if (state.full) window.addEventListener("hashchange", openHashReference);

  bindCopyButtons();
}

function applyReferenceFilter() {
  const visible = visibleReferences();
  if (visible.length && !visible.some((ref) => ref.id === state.referenceId)) {
    state.referenceId = visible[0].id;
  }
  renderExplorer();
  scrollActiveTraceIntoView();
}

function openHashReference() {
  const refId = location.hash.slice(1);
  const index = state.data.demos.findIndex((demo) => demo.references.some((ref) => ref.id === refId));
  if (index >= 0) chooseDialogue(index, refId);
}

async function fetchJson(path) {
  if (embeddedPreview) {
    if (!Object.hasOwn(embeddedPreview.json, path)) throw new Error(`Missing preview data: ${path}`);
    return embeddedPreview.json[path];
  }
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

const discrepancyExamples = {
  identical: {
    mapId: "m0", title: "The same camera shop, in the same place.",
    labels: ["camera shop", "camera shop"], counts: ["Present on the giver's map", "Present on the follower's map"],
    regions: [[[5.2, 71.4, 16, 9.3]], [[5.2, 72.5, 16, 9.1]]],
    caption: "Both maps show a camera shop near the start, with the same name and position. There is no designed discrepancy for this landmark; whether a particular reference is grounded still depends on the dialogue.",
  },
  lexical: {
    mapId: "m6", title: "The same icon/position, but different names.",
    labels: ["fast flowing river", "fast running creek"], counts: ["Giver's label", "Follower's label"],
    regions: [[[66, 1.8, 16, 9.1]], [[65.5, 2.7, 17.5, 9.2]]],
    caption: "The watercourse has the same icon and position on both maps, but its label differs. This is a lexical discrepancy, not evidence of different referents. GMMT unifies such lexical variants during annotation.",
  },
  existence: {
    mapId: "m0", title: "A youth hostel for one participant. None for the other.",
    labels: ["youth hostel", "no youth hostel"], counts: ["Present", "Absent at the corresponding location"],
    regions: [[[28.8, 19, 15, 9.6]], [[28.8, 19, 15, 9.6]]],
    caption: "The giver's map contains a youth hostel. The follower's does not. The dashed outline indicates the corresponding empty location, not another object. The follower, who lacks this landmark, may need to imagine its location based on the giver's description in the dialogue.",
  },
  multiplicity: {
    mapId: "m0", title: "Two parked vans. Only one is shared.",
    labels: ["parked van × 2", "parked van × 1"], counts: ["Upper + lower instances", "Upper instance only"],
    regions: [[[30.8, 4.5, 14.5, 7.7], [9, 88.1, 13, 6.8]], [[32.1, 5.6, 14.5, 7.7]]],
    caption: "The giver has two parked vans; the follower has only the upper, shared one. In the original MapTask design, the shared instance is farther from the route, while the giver-only instance is closer. The giver may therefore focus on the nearby, route-relevant van and call it “the parked van”, overlooking the more distant alternative—even though that alternative is the only van on the follower's map.",
  },
};

function discrepancyMapMarkup(type, side) {
  const example = discrepancyExamples[type];
  const index = side === "giver" ? 0 : 1;
  // Bounds cover each icon and its handwritten name, with room for the outline.
  return `${mapImageMarkup(example.mapId, side)}${example.regions[index].map(([x, y, width, height]) => `<span class="gallery-ring ${side} ${type === "existence" && index === 1 ? "absent" : ""}" style="left:${x}%;top:${y}%;width:${width}%;height:${height}%" aria-hidden="true"></span>`).join("")}`;
}

function renderDiscrepancy(type) {
  const example = discrepancyExamples[type];
  const panel = document.querySelector("#discrepancy-panel");
  if (!panel) return;
  panel.setAttribute("aria-labelledby", `tab-${type}`);
  document.querySelectorAll("[data-discrepancy]").forEach((button) => {
    const active = button.dataset.discrepancy === type;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  panel.innerHTML = `<div class="gallery-map-pair">${["giver", "follower"].map((side, index) => {
    return `<figure class="gallery-map ${side}"><div class="gallery-map-label"><b>${titleCase(side)}</b><span>${example.labels[index]}</span></div><button class="gallery-map-image map-zoom-trigger" type="button" data-side="${side}" data-example="${type}" aria-haspopup="dialog" aria-label="Enlarge ${side} map: ${example.labels[index]}" title="Click to enlarge map">${discrepancyMapMarkup(type, side)}</button><figcaption>${example.counts[index]}</figcaption></figure>`;
  }).join("")}</div><div class="gallery-caption"><h3>${example.title}</h3><p>${example.caption}</p></div>`;
  bindMapZoom(panel);
}

function bindDiscrepancyTabs() {
  const buttons = [...document.querySelectorAll("[data-discrepancy]")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => renderDiscrepancy(button.dataset.discrepancy));
    button.addEventListener("keydown", (event) => {
      let next;
      if (["ArrowDown", "ArrowRight"].includes(event.key)) next = (index + 1) % buttons.length;
      if (["ArrowUp", "ArrowLeft"].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      renderDiscrepancy(buttons[next].dataset.discrepancy);
      buttons[next].focus();
    });
  });
  if (buttons.length) renderDiscrepancy("multiplicity");
}

async function init() {
  try {
    [state.data, state.hotspots] = await Promise.all([
      fetchJson(state.full ? "./data/corpus-data.json" : "./data/demo-data.json"),
      fetchJson("./data/hotspots.json"),
    ]);
    const requestedId = state.full ? location.hash.slice(1) : "";
    const requestedIndex = state.data.demos.findIndex((demo) => demo.references.some((ref) => ref.id === requestedId));
    if (requestedIndex >= 0) state.demoIndex = requestedIndex;
    state.referenceId = requestedIndex >= 0 ? requestedId : featuredReference(currentDemo()).id;
    state.source = "gpt5";
    bindControls();
    bindMapZoomDialog();
    bindDiscrepancyTabs();
    renderExplorer();
    scrollActiveTraceIntoView();
  } catch (error) {
    const frame = document.querySelector(".explorer-frame");
    if (frame) {
      frame.innerHTML = `
        <div class="load-error">
          <strong>The explorer data could not be loaded.</strong>
          <span>Serve this directory over HTTP (for example, <code>python3 -m http.server</code>) and refresh.</span>
        </div>`;
    }
    console.error(error);
  }
}

init();

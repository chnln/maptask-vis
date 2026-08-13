const state = {
  data: null,
  hotspots: null,
  excerpts: null,
  demoIndex: 0,
  source: "human",
  referenceId: "q1ec2.ref.7",
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

function mapHotspots(demo, side) {
  return state.hotspots?.maps?.[demo.mapId]?.[side] ?? [];
}

function hotspotIsActive(hotspot, annotation, side) {
  return splitInterpretations(annotation[side]).includes(hotspot.id);
}

function hotspotIsRelated(hotspot, annotation) {
  const hotspotBase = baseLandmarkId(hotspot.id);
  return ["giver", "follower"].some((side) =>
    splitInterpretations(annotation[side]).some((id) => baseLandmarkId(id) === hotspotBase),
  );
}

function hotspotMarkup(hotspot, annotation, side) {
  const active = hotspotIsActive(hotspot, annotation, side);
  const related = hotspotIsRelated(hotspot, annotation);
  const selected = hotspot.id === state.selectedLandmark;
  const classes = ["map-hotspot", active ? `is-active ${side}` : "", related ? "is-related" : "", selected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");
  // Percentage radii describe the visual target area. Clamp the rendered
  // control so neighboring landmarks remain independently clickable.
  const diameter = Math.max(4.5, Math.min(11, Number(hotspot.r ?? 5) * 1.35));

  return `
    <button
      class="${classes}"
      type="button"
      data-landmark-id="${escapeHtml(hotspot.id)}"
      style="--x:${Number(hotspot.x)}%;--y:${Number(hotspot.y)}%;--size:${diameter}%"
      aria-label="Select ${escapeHtml(hotspot.label)}"
      aria-pressed="${active || selected ? "true" : "false"}"
    >
      <span class="hotspot-ring" aria-hidden="true"></span>
      <span class="hotspot-label">${escapeHtml(hotspot.label)}</span>
    </button>`;
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
        <small>${escapeHtml(filename)} · ${hotspots.length} annotated hotspots</small>
      </div>
      <div class="real-map-wrap">
        <img
          class="real-map-image"
          src="./static/images/maps/${escapeHtml(filename)}"
          alt="HCRC Map Task ${escapeHtml(demo.mapId)} ${isGiver ? "giver" : "follower"} map"
          width="791"
          height="1024"
          loading="${demo.mapId === "m9" ? "eager" : "lazy"}"
        />
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
}

function chooseLandmark(landmarkId) {
  const demo = currentDemo();
  const side = landmarkId.endsWith("@g") ? "giver" : "follower";
  const directMatch = demo.references.find((reference) =>
    splitInterpretations(reference.annotations[state.source][side]).includes(landmarkId),
  );
  const baseMatch = demo.references.find((reference) => {
    const annotation = reference.annotations[state.source];
    return ["giver", "follower"].some((role) =>
      splitInterpretations(annotation[role]).some(
        (candidate) => baseLandmarkId(candidate) === baseLandmarkId(landmarkId),
      ),
    );
  });

  state.selectedLandmark = landmarkId;
  state.referenceId = (directMatch ?? baseMatch ?? currentReference()).id;
  state.query = "";
  state.status = "all";
  const search = document.querySelector("#trace-search");
  const filter = document.querySelector("#status-filter");
  if (search) search.value = "";
  if (filter) filter.value = "all";
  renderExplorer();
  scrollActiveTraceIntoView();
}

function statusMarkup(status) {
  return `<span class="status-dot ${status}" aria-label="${escapeHtml(statusLabels[status])}"></span>`;
}

function renderTrace() {
  const demo = currentDemo();
  const query = state.query.trim().toLowerCase();
  const visible = demo.references.filter((reference) => {
    const status = reference.annotations[state.source].status;
    return (state.status === "all" || status === state.status)
      && (!query || `${reference.id} ${reference.expression}`.toLowerCase().includes(query));
  });

  const count = document.querySelector("#trace-count");
  const list = document.querySelector("#trace-list");
  if (!list) return;
  if (count) count.textContent = `${visible.length} RE${visible.length === 1 ? "" : "s"}`;

  list.innerHTML = visible.length
    ? visible.map((reference) => {
        const annotation = reference.annotations[state.source];
        const sourceDisagrees = reference.annotations.gpt5.status !== reference.annotations.human.status;
        return `
          <button class="trace-item ${reference.id === state.referenceId ? "is-active" : ""}" type="button" data-reference-id="${escapeHtml(reference.id)}">
            <span class="speaker-token ${reference.speaker}">${reference.speaker === "giver" ? "G" : "F"}</span>
            <span class="trace-copy">
              <span class="trace-expression">“${escapeHtml(reference.expression)}”</span>
              <small>utt ${reference.utteranceId} · ${escapeHtml(reference.id)}${sourceDisagrees ? " · source shift" : ""}</small>
            </span>
            ${statusMarkup(annotation.status)}
          </button>`;
      }).join("")
    : `<div class="empty-trace"><strong>No matches</strong><span>Try another state or search term.</span></div>`;

  list.querySelectorAll(".trace-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.referenceId = button.dataset.referenceId;
      state.selectedLandmark = null;
      renderExplorer();
    });
  });
}

function renderDialogueExcerpt() {
  const container = document.querySelector("#dialogue-excerpt");
  if (!container) return;
  const demo = currentDemo();
  const excerpt = state.excerpts?.dialogues?.[demo.dialogueId];
  if (!excerpt) {
    container.innerHTML = `<p class="excerpt-unavailable">No curated transcript excerpt is available for this dialogue.</p>`;
    return;
  }

  const hasSelectedTurn = excerpt.turns.some(({ refIds = [] }) => refIds.includes(state.referenceId));
  container.innerHTML = `
    <div class="excerpt-heading">
      <span>Real transcript excerpt</span>
      <small>${escapeHtml(demo.dialogueId)} · around ${escapeHtml(excerpt.focusRefId)}</small>
    </div>
    <div class="excerpt-turns">
      ${excerpt.turns.map((turn) => {
        const refIds = turn.refIds ?? [];
        const selected = refIds.includes(state.referenceId)
          || (!hasSelectedTurn && refIds.includes(excerpt.focusRefId));
        const clickableId = refIds.find((id) => demo.references.some((reference) => reference.id === id));
        const text = escapeHtml(turn.text);
        const markedText = selected && currentReference()?.expression
          ? text.replace(
              escapeHtml(currentReference().expression),
              `<mark>${escapeHtml(currentReference().expression)}</mark>`,
            )
          : text;
        const tag = clickableId ? "button" : "div";
        return `
          <${tag} class="excerpt-turn ${turn.speaker} ${selected ? "is-active" : ""}" ${clickableId ? `type="button" data-reference-id="${escapeHtml(clickableId)}"` : ""}>
            <span class="excerpt-speaker">${turn.speaker === "giver" ? "G" : "F"}</span>
            <span class="excerpt-text">${markedText}</span>
            <small>utt ${turn.utteranceId}</small>
          </${tag}>`;
      }).join("")}
    </div>`;

  container.querySelectorAll("button[data-reference-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.referenceId = button.dataset.referenceId;
      state.selectedLandmark = null;
      renderExplorer();
      scrollActiveTraceIntoView();
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

  applyJudgmentStyle(document.querySelector("#gold-judgment"), reference.sins.gold);
  applyJudgmentStyle(document.querySelector("#text-judgment"), reference.sins.predictions.textOnly, reference.sins.gold);
  applyJudgmentStyle(document.querySelector("#maps-judgment"), reference.sins.predictions.bothMaps, reference.sins.gold);
}

function featuredReference(demo) {
  const preferredByMap = {
    m9: "q1ec2.ref.7",
    m6: "q1nc3.ref.21",
    m12: "q1nc7.ref.34",
  };
  return demo.references.find((reference) => reference.id === preferredByMap[demo.mapId])
    ?? demo.references.find((reference) => reference.annotations.human.status === "misunderstood")
    ?? demo.references[0];
}

function renderMapSwitcher() {
  const switcher = document.querySelector("#map-switcher");
  if (!switcher) return;
  switcher.innerHTML = state.data.demos.map((demo, index) => `
    <button type="button" class="${index === state.demoIndex ? "is-active" : ""}" data-demo-index="${index}" aria-pressed="${index === state.demoIndex}">
      <span>${escapeHtml(demo.mapId)}</span>
      <small>${escapeHtml(demo.focus)}</small>
    </button>`).join("");

  switcher.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.demoIndex = Number(button.dataset.demoIndex);
      state.referenceId = featuredReference(currentDemo()).id;
      state.query = "";
      state.status = "all";
      state.selectedLandmark = null;
      const search = document.querySelector("#trace-search");
      const filter = document.querySelector("#status-filter");
      if (search) search.value = "";
      if (filter) filter.value = "all";
      renderExplorer();
    });
  });
}

function renderExplorer() {
  const demo = currentDemo();
  const currentMap = document.querySelector("#current-map-id");
  const currentDialogue = document.querySelector("#current-dialogue-id");
  if (currentMap) currentMap.textContent = demo.mapId;
  if (currentDialogue) currentDialogue.textContent = demo.dialogueId;
  renderMapSwitcher();
  renderMapPair();
  renderDialogueExcerpt();
  renderTrace();
  renderDetail();
}

function scrollActiveTraceIntoView() {
  requestAnimationFrame(() => {
    const activeItem = document.querySelector(".trace-item.is-active");
    const traceList = document.querySelector("#trace-list");
    if (!activeItem || !traceList) return;
    traceList.scrollTop = Math.max(0, activeItem.offsetTop - traceList.offsetTop - (traceList.clientHeight - activeItem.clientHeight) / 2);
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
      document.querySelectorAll("[data-source]").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderExplorer();
    });
  });

  document.querySelector("#trace-search")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTrace();
  });

  document.querySelector("#status-filter")?.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderTrace();
  });

  bindCopyButtons();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function init() {
  try {
    [state.data, state.hotspots, state.excerpts] = await Promise.all([
      fetchJson("./data/demo-data.json"),
      fetchJson("./data/hotspots.json"),
      fetchJson("./data/dialogue-excerpts.json"),
    ]);
    state.referenceId = featuredReference(currentDemo()).id;
    bindControls();
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

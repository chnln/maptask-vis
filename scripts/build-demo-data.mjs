#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DEMOS = [
  { mapId: "m0", dialogueId: "q8nc6", focus: "Parked van" },
  { mapId: "m9", dialogueId: "q1ec2", focus: "Multiplicity" },
  { mapId: "m6", dialogueId: "q1nc3", focus: "Lexical variants" },
  { mapId: "m12", dialogueId: "q1nc7", focus: "Repair over time" },
];

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Expected --key value, received: ${key ?? ""} ${value ?? ""}`);
    }
    values[key.slice(2)] = resolve(value);
  }
  return values;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readJsonLines(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

function parseCsv(path) {
  const [header, ...rows] = readFileSync(path, "utf8").trim().split("\n");
  const keys = header.split(",");
  return rows.map((row) =>
    Object.fromEntries(row.split(",").map((value, index) => [keys[index], value])),
  );
}

function indexPredictions(path) {
  return Object.fromEntries(readJsonLines(path).map(({ ref_id, judge }) => [ref_id, judge]));
}

function normalizeAnnotation(reference) {
  return {
    giver: reference.interpretations.giver,
    follower: reference.interpretations.follower,
    status: reference.extra.status,
    subtype: reference.extra.subtype,
    reason: reference.reason ?? "",
    cascade: {
      quantificational: reference.is_quantificational,
      specified: reference.is_specified,
      accommodated: reference.interpretations.is_accommodated,
      grounded: reference.interpretations.is_grounded,
      imagined: reference.interpretations.is_imagined,
    },
  };
}

function byReferenceId(references) {
  return Object.fromEntries(references.map((reference) => [reference.ref_id_unif, reference]));
}

const args = parseArgs(process.argv.slice(2));
const gmmtDir = args.gmmt;
const experimentDir = args.experiments;
const outPath = args.out;
const timedUnitsDir = args["timed-units"];

if (!gmmtDir || !experimentDir || !outPath || !timedUnitsDir) {
  throw new Error(
    "Usage: build-demo-data.mjs --gmmt /path/to/gmmt --experiments /path/to/maptask-perspective-taking --timed-units /path/to/combined --out data/demo-data.json [--corpus data/corpus-data.json]",
  );
}

const assetsDir = resolve(gmmtDir, "annotations/assets");
const landmarkRows = parseCsv(resolve(assetsDir, "landmarks_configuration.csv"));
const lexicalData = readJson(resolve(assetsDir, "lexical_variant_landmark_info.json"));
const lexicalPairs = lexicalData.landmarks.flat();
const multiplicity = readJson(resolve(assetsDir, "multiplicity_landmark_position.json")).landmarks;

const predictionPaths = {
  textOnly: resolve(
    experimentDir,
    "outputs/predictions/additional-models/qwen3-vl_on_text-only/third-run/text-only/predictions__qwen3-vl-8b__text-only__text_access-startUntilCurTranx.jsonl",
  ),
  bothMaps: resolve(
    experimentDir,
    "outputs/predictions/third-run/predictions/both-maps/predictions__both-maps__text_access-startUntilCurTranx__maps-1024px.jsonl",
  ),
};

const predictions = {
  textOnly: indexPredictions(predictionPaths.textOnly),
  bothMaps: indexPredictions(predictionPaths.bothMaps),
};

function readTurns(dialogueId, references) {
  const units = readJson(resolve(timedUnitsDir, `${dialogueId}.json`)).timed_units;
  const unitsById = Object.fromEntries(units.map((unit) => [unit.tu_id_unif, unit]));
  const extracted = byReferenceId(readJson(resolve(gmmtDir, `reference_expressions/${dialogueId}.reference_expressions.json`)).landmark_reference_expressions);
  const turns = [];
  const offsets = new Map();
  for (const unit of units) {
    let turn = turns.at(-1);
    if (!turn || turn.speaker !== unit.speaker || turn.utteranceId !== unit.utt_id) {
      turn = { speaker: unit.speaker, utteranceId: unit.utt_id, lineNumber: turns.length + 1, text: "", spans: [] };
      turns.push(turn);
    }
    const text = unit.text.trim().replace(/\s+/g, " ");
    if (text && turn.text) turn.text += " ";
    const start = turn.text.length;
    turn.text += text;
    offsets.set(unit.tu_id_unif, { turnIndex: turns.length - 1, start, end: turn.text.length });
  }
  // Anchor by released timed-unit IDs, not the lossy nested <<...>> display format.
  for (const ref of references) {
    const spans = [];
    const releasedIds = extracted[ref.id].timed_unit_ids;
    const releasedUnits = releasedIds.map((id) => {
      const unit = unitsById[id];
      if (!unit) throw new Error(`Missing timed unit ${id} for ${ref.id}`);
      return unit;
    });
    const foreignUnits = releasedUnits.filter((unit) => unit.speaker !== ref.speaker);
    const displayIds = releasedUnits.filter((unit) => unit.speaker === ref.speaker).map((unit) => unit.tu_id_unif);
    if (foreignUnits.length) {
      ref.releasedExpression = ref.expression;
      ref.expression = displayIds.map((id) => unitsById[id].text.trim()).filter(Boolean).join(" ");
      ref.displayCorrection = {
        type: "cross-speaker-timed-units",
        excludedTimedUnits: foreignUnits.map((unit) => ({
          id: unit.tu_id_unif,
          speaker: unit.speaker,
          utteranceId: unit.utt_id,
          text: unit.text,
        })),
      };
    }
    for (const id of displayIds) {
      const offset = offsets.get(id);
      if (!offset) throw new Error(`Missing timed unit ${id} for ${ref.id}`);
      if (offset.start === offset.end) continue;
      const previous = spans.at(-1);
      if (previous && previous.turnIndex === offset.turnIndex && /^\s*$/.test(turns[offset.turnIndex].text.slice(previous.end, offset.start)) && offset.start >= previous.end) previous.end = offset.end;
      else spans.push({ ...offset });
    }
    if (!spans.length) throw new Error(`No transcript span for ${ref.id}`);
    for (const { turnIndex, start, end } of spans) turns[turnIndex].spans.push({ id: ref.id, start, end });
  }
  for (const turn of turns) turn.refIds = [...new Set(turn.spans.map((span) => span.id))];
  return turns;
}

function buildDialogue(demo) {
  const machine = readJson(
    resolve(gmmtDir, `annotations/dialogues/${demo.dialogueId}.annotated.json`),
  ).landmark_reference_expressions;
  const humanPath = resolve(gmmtDir, `annotations/human_verified_subset/${demo.dialogueId}.annotated.json`);
  const humanById = existsSync(humanPath) ? byReferenceId(readJson(humanPath).landmark_reference_expressions) : {};

  const references = machine.map((reference) => {
    const id = reference.ref_id_unif;
    const humanReference = humanById[id];

    return {
      id,
      utteranceId: reference.info.utt_id,
      speaker: reference.info.speaker,
      addressee: reference.info.addressee,
      expression: reference.info.expression,
      conceptId: reference.info.concept_id,
      annotations: {
        gpt5: normalizeAnnotation(reference),
        ...(humanReference ? { human: normalizeAnnotation(humanReference) } : {}),
      },
      sins: {
        gold: reference.extra.status === "aligned" ? "Yes" : "No",
        predictions: {
          textOnly: predictions.textOnly[id] ?? null,
          bothMaps: predictions.bothMaps[id] ?? null,
        },
      },
    };
  });

  return {
    ...demo,
    humanVerified: Object.keys(humanById).length > 0,
    turns: readTurns(demo.dialogueId, references),
    landmarks: landmarkRows
      .filter((row) => row.map === demo.mapId)
      .map((row) => ({
        id: row.id,
        name: row.name,
        giverCount: Number(row.giver_map_appears),
        followerCount: Number(row.follower_map_appears),
      })),
    lexicalPairs: lexicalPairs.filter((pair) => pair.map_id === demo.mapId),
    multiplicity: multiplicity[Object.keys(multiplicity).find((id) => id.startsWith(`${demo.mapId}_`))] ?? null,
    references,
  };
}

const demos = DEMOS.map(buildDialogue);

const payload = {
  metadata: {
    title: "GMMT × SINS interactive research preview",
    scope: "Four full dialogues, including three human-verified dialogues; all 128 dialogues in the corpus browser",
    annotationSources: {
      gpt5: "GPT-5 · structured annotation · default parameters",
      human: "Human-verified gold · one annotator with co-author discussion for ambiguous cases",
    },
    sinsModel: "Qwen3-VL-8B-Instruct",
    sinsTextWindow: "Dialogue start through current transaction",
    sourceLicense: "GMMT annotations and HCRC MapTask transcripts: CC BY 4.0; see NOTICE.md",
  },
  demos,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote ${demos.length} maps and ${demos.reduce((total, demo) => total + demo.references.length, 0)} reference expressions to ${outPath}`,
);

if (args.corpus) {
  const dialogues = readFileSync(resolve(assetsDir, "map_trans_mapping.txt"), "utf8").trim().split(/\r?\n/).flatMap((line) => {
    const [map, ...ids] = line.trim().split(/\s+/);
    return ids.map((dialogueId) => buildDialogue({ mapId: `m${map}`, dialogueId }));
  });
  writeFileSync(args.corpus, JSON.stringify({ metadata: { ...payload.metadata, scope: "All 128 dialogues and 13,077 released GMMT annotations" }, demos: dialogues }));
  console.log(`Wrote full corpus: ${dialogues.length} dialogues, ${dialogues.reduce((sum, item) => sum + item.references.length, 0)} references`);
}

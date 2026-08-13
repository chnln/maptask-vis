#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEMOS = [
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

if (!gmmtDir || !experimentDir || !outPath) {
  throw new Error(
    "Usage: build-demo-data.mjs --gmmt /path/to/gmmt --experiments /path/to/maptask-perspective-taking --out data/demo-data.json",
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

const demos = DEMOS.map((demo) => {
  const machine = readJson(
    resolve(gmmtDir, `annotations/dialogues/${demo.dialogueId}.annotated.json`),
  ).landmark_reference_expressions;
  const human = readJson(
    resolve(gmmtDir, `annotations/human_verified_subset/${demo.dialogueId}.annotated.json`),
  ).landmark_reference_expressions;
  const machineById = byReferenceId(machine);

  const references = human.map((reference) => {
    const id = reference.ref_id_unif;
    const machineReference = machineById[id];
    if (!machineReference) throw new Error(`Missing GPT-5 annotation for ${id}`);

    return {
      id,
      utteranceId: reference.info.utt_id,
      speaker: reference.info.speaker,
      addressee: reference.info.addressee,
      expression: reference.info.expression,
      conceptId: reference.info.concept_id,
      annotations: {
        gpt5: normalizeAnnotation(machineReference),
        human: normalizeAnnotation(reference),
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
});

const payload = {
  metadata: {
    title: "GMMT × SINS interactive research preview",
    scope: "Three human-verified dialogues; reference-expression text only",
    annotationSources: {
      gpt5: "GPT-5 · structured annotation · default parameters",
      human: "Human-verified gold · one annotator with co-author discussion for ambiguous cases",
    },
    sinsModel: "Qwen3-VL-8B-Instruct",
    sinsTextWindow: "Dialogue start through current transaction",
    sourceLicense: "GMMT sample data: CC BY 4.0",
  },
  demos,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote ${demos.length} maps and ${demos.reduce((total, demo) => total + demo.references.length, 0)} reference expressions to ${outPath}`,
);

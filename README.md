# MapTask Vis — Grounded Interpretations in MapTask

[Project homepage](https://chnln.github.io/maptask-vis/) ·
[Browse the corpus](https://chnln.github.io/maptask-vis/explorer.html) ·
[Releases](https://github.com/chnln/maptask-vis/releases)

This repository contains the academic project page for two related MapTask
resources:

- **GMMT — Grounded Misunderstandings in MapTask**, a perspectivist dataset
  that records the giver's and follower's landmark interpretations
  (**LREC 2026**); and
- **SINS — Seeing Is Not Sharing**, an interpretation-matching benchmark for
  testing whether language and vision-language models can distinguish
  potential common ground from grounded agreement (**SIGDIAL 2026**).

The page follows the familiar single-paper project-page format—title, authors,
paper/data/code links, overview, results, publications, and citation—while
making the research example directly explorable. It is a static,
dependency-free site suitable for GitHub Pages.

## Interactive research example

The explorer combines three separately attributed layers:

1. **HCRC MapTask source material:** authentic route-giver and route-follower
   maps plus complete transcripts (a moving context window on the homepage);
2. **GMMT annotations:** the two participants' predicted or human-verified
   landmark interpretations and the resulting aligned, pending, or
   misunderstood state; and
3. **SINS results:** the displayed model's Yes/No interpretation-matching
   judgment under its stated map-access condition.

Users can select a MapTask example, inspect the dialogue beside both maps, and
click a landmark hotspot to compare the giver-side and follower-side
interpretations. Every prediction shown in the interface identifies its model
and evidence condition. Hotspots and highlights are presentation overlays; they
do not replace the underlying maps or annotation records.

The homepage starts with four landmark-relationship tabs (identical, lexical,
existence, multiplicity), defaulting to the real Map 0 parked vans. Its dialogue
example is q8nc6. The paper's rearranged, simplified illustration is not treated
as a literal transcript or map layout.

The separate corpus browser includes all **128 dialogues / 13,077 annotations**.
Only q1ec2, q1nc3 and q1nc7 have a human-verified layer (504 references). All 32
maps are included, with **431 clickable physical landmark regions**, including
start/finish markers. The regions are AI-assisted visual estimates on each
original map, not corpus-supplied or human-verified gold bounding boxes, and
not outputs of the GMMT/SINS annotation models. Irregular
water/terrain features use their label and a nearby interior area; smaller
regions sit above larger ones where their rectangles overlap.
The map selection, landmark-list highlight, and related mentions are linked.
Lexical equivalents share a list item; multiplicity mentions include all
instances, while the selected physical instance is highlighted on its map.
Landmarks with no mention in a dialogue remain clickable and show an empty state.
GPT-5 annotation is selected initially and whenever the dialogue changes;
the human-verified layer is an explicit alternative where available.
SINS dataset targets always come from the released GPT-5 layer, independently
of which GMMT annotation layer is being inspected.

### How the homepage dialogue windows are chosen

The four homepage dialogues and opening references are editorially selected,
not randomly sampled or selected online by a model:

| Map | Dialogue | Opening reference | Demonstration focus |
| --- | --- | --- | --- |
| m0 | q8nc6 | q8nc6.ref.2 | Parked-van multiplicity |
| m9 | q1ec2 | q1ec2.ref.7 | Multiplicity |
| m6 | q1nc3 | q1nc3.ref.21 | Lexical variants |
| m12 | q1nc7 | q1nc7.ref.34 | Repair over time |

The homepage shows up to five transcript lines before the selected reference's
first line and seven after it (13 lines including the anchor, clipped at the
dialogue boundaries). Selecting another reference moves this window. Lines
are consecutive time-ordered units grouped by speaker and utterance ID, not
necessarily alternating conversational turns. These display windows are not
the annotation/model evidence window (dialogue start through the current
transaction). The corpus browser always renders the complete transcript.

The site does **not** include HCRC MapTask audio or video. See [NOTICE.md](NOTICE.md) for source attribution,
modification notes, and the license that applies to each layer.

## Run locally

The checked-in website needs only **Python 3 and a modern browser**. No npm
packages, API keys, model inference service, or application backend are needed.
The server below only serves static files; all interaction runs in the browser.

```bash
git clone https://github.com/chnln/maptask-vis.git
cd maptask-vis
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/), or
[the corpus browser](http://127.0.0.1:4173/explorer.html). Press Ctrl+C in the
terminal to stop serving. Cloning requires repository access while the source
repository is private; the published Pages website is publicly accessible.

Do **not** double-click `index.html` or `explorer.html`: Chrome and other
browsers normally block the local `fetch()` requests used by these pages.

### Editing and offline previews

**Node.js 22 or newer** is used for generation and validation (no dependency
installation). Edit `index.html`, `styles.css`, and `app.js`; `explorer.html`
is generated from the homepage's shared reader and should not be edited directly.

After changing the site or demo data, regenerate both snapshots and the shared
`explorer.html` route with:

```bash
node scripts/build-preview.mjs
```

This produces `preview.html` and `explorer-preview.html`, which embed their
styles, scripts, maps, data, and attribution. Keep the two files together for
navigation. They can be opened offline without `fetch()`; if your browser
restricts local-file navigation, use the HTTP command above. External links
still require internet access. Generated offline previews are ignored by Git
and distributed together in the release's `maptask-vis-v0.1.0-offline.zip`.

## Rebuild the annotation and prediction extract

The checked-in demo JSON is generated from a local GMMT release and the SINS
experiment outputs:

```bash
node scripts/build-demo-data.mjs \
  --gmmt /path/to/grounded-misunderstandings-in-maptask \
  --experiments /path/to/maptask-perspective-taking \
  --timed-units /path/to/timed-units_json-transformed/combined \
  --out data/demo-data.json \
  --corpus data/corpus-data.json
node scripts/build-preview.mjs
```

The generator keeps the two kinds of model output distinct:

- GMMT's GPT-5 layer infers and annotates each participant's landmark interpretation;
- SINS predictions answer whether the two interpretations match—they do not
  predict the landmark IDs themselves.

Transcript spans are anchored directly by the release's `timed_unit_ids` and
the preprocessed, time-ordered HCRC timed units. Do not recover them from
`<<...>>` display markup: nested and crossing references lose their identities
in that format. The exporter retains separate spans and per-line ID buttons,
including overlapping references. All 13,077 span texts, starting speaker roles
and utterance IDs are checked against released annotation records.

The human-verified toggle is available only for the selected verified examples.
The rebuild command does not download HCRC source material; map assets and
transcripts must be prepared from an independently obtained copy of the
official corpus and attributed as described in [NOTICE.md](NOTICE.md).

## Checks

Run the JavaScript syntax checks before publishing:

```bash
node scripts/build-preview.mjs
node --check app.js
node --check scripts/build-demo-data.mjs
node --check scripts/build-preview.mjs
node --check scripts/build-site.mjs
node scripts/check-site.mjs
node scripts/build-site.mjs
```

`check-site.mjs` checks all transcript anchors and runs dependency-free
DOM-stub smoke tests for both offline pages, deep links, all four tabs, all 128
dialogues, source switching, filtering, reference navigation, all 431 landmark
regions and their linked list/mention controls. It does not
verify browser rendering or responsive layout. For visual QA, serve the site
locally and verify that:

- the paper, dataset, and code links open correctly;
- changing examples updates both maps and the adjacent dialogue;
- landmark hotspots are keyboard-accessible and update both interpretations;
- model names and map-access conditions match the underlying prediction; and
- desktop and narrow mobile layouts have no clipped controls or horizontal
  overflow.

## Deployment: GitHub Pages

Repository: [chnln/maptask-vis](https://github.com/chnln/maptask-vis).
Website: [https://chnln.github.io/maptask-vis/](https://chnln.github.io/maptask-vis/).

GitHub Pages serves this static site directly; no rented server or separate
backend is required. Pages uses **Settings → Pages → Build and deployment →
GitHub Actions**. The workflow in `.github/workflows/pages.yml` runs on pushes
to `main` and can also be started manually from Actions. It regenerates the
corpus route and offline previews, runs the regression checks, packages an
explicit allowlist of public files into `_site/`, then deploys that directory.
Git metadata, scripts, local files, and offline preview duplicates are not
published as website assets. Relative URLs support the `/maptask-vis/` subpath.

For updates:

```bash
node scripts/build-preview.mjs
node scripts/check-site.mjs
node scripts/build-site.mjs
git add <changed-files>
git commit -m "Update project page"
git push origin main
```

Commit the regenerated `explorer.html` and `data/map-image-hashes.json` when
they change. The workflow fails if these tracked generated files are stale.
You can also check exactly what will be published:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory _site
```

### Known limitations

- Hotspots are approximate UI regions, not a bounding-box evaluation dataset.
- Human verification covers three dialogues (504 references), not the full corpus.
- SINS judgments shown here are saved **Qwen3-VL-8B-Instruct** outputs, not live
  inference or results for every model in the paper.
- Six released GPT-5 interpretation fields refer to `m2_stone_creek@f`, which
  has no corresponding physical landmark in the released map catalog. The
  original IDs are preserved and the UI reports the absent map counterpart;
  it does not invent a landmark region.

## Provenance and source resources

- [Official HCRC MapTask v2.1 download page](https://groups.inf.ed.ac.uk/maptask/maptasknxt.html)
- [GMMT on GitHub](https://github.com/chnln/grounded-misunderstandings-in-maptask)
- [GMMT on Hugging Face](https://huggingface.co/datasets/chnln/grounded-misunderstandings-in-maptask)
- [SINS on GitHub](https://github.com/chnln/seeing-is-not-sharing)
- [SINS on Hugging Face](https://huggingface.co/datasets/chnln/seeing-is-not-sharing)

## Citations

Please cite the original corpus and the relevant dataset paper(s), rather than
treating this visualization release as a new dataset release. Import all three
entries from [CITATION.bib](CITATION.bib), or use the BibTeX below.

1. Anderson, Anne H., et al. (1991). “The HCRC Map Task Corpus.”
   *Language and Speech*, 34(4), 351–366.
   <https://doi.org/10.1177/002383099103400404>
2. Li, Nan; Gatt, Albert; and Poesio, Massimo (2026). “Grounded
   Misunderstandings in Asymmetric Dialogue: A Perspectivist Annotation Scheme
   for MapTask.” *Proceedings of LREC 2026*, 4988–5001.
   <https://doi.org/10.63317/59anbt78wyj7>
3. Li, Nan; Gatt, Albert; and Poesio, Massimo (2026). “Seeing Is Not Sharing:
   Some Vision-Language Models Overestimate Common Ground in Asymmetric
   Dialogue.” *Proceedings of SIGDIAL 2026*, 694–710.
   <https://aclanthology.org/2026.sigdial-1.49/>

<details>
<summary>BibTeX for GMMT and SINS</summary>

```bibtex
@inproceedings{li2026grounded,
  title = {Grounded Misunderstandings in Asymmetric Dialogue:
    A Perspectivist Annotation Scheme for {MapTask}},
  author = {Li, Nan and Gatt, Albert and Poesio, Massimo},
  booktitle = {Proceedings of the Fifteenth Language Resources
    and Evaluation Conference (LREC 2026)},
  year = {2026},
  pages = {4988--5001},
  publisher = {European Language Resources Association (ELRA)},
  doi = {10.63317/59anbt78wyj7},
  url = {https://lrec.elra.info/lrec2026-main-392}
}

@inproceedings{li2026seeing,
  title = {Seeing Is Not Sharing: Some Vision-Language Models
    Overestimate Common Ground in Asymmetric Dialogue},
  author = {Li, Nan and Gatt, Albert and Poesio, Massimo},
  booktitle = {Proceedings of the 27th Annual Meeting of the
    Special Interest Group on Discourse and Dialogue},
  year = {2026},
  pages = {694--710},
  publisher = {Association for Computational Linguistics},
  url = {https://aclanthology.org/2026.sigdial-1.49/}
}
```

</details>

## License

The MIT license in [LICENSE](LICENSE) covers only original website software.
HCRC source material and GMMT/SINS research content keep their own licenses;
see [NOTICE.md](NOTICE.md). Cloning or publishing this repository does not merge
those materials into a single MIT-licensed work.

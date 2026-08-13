# GMMT × SINS academic project page

This repository contains the academic project page for two related MapTask
resources:

- **GMMT — Grounded Misunderstandings in MapTask**, a perspectivist dataset
  that records the giver's and follower's landmark interpretations; and
- **SINS — Seeing Is Not Sharing**, an interpretation-matching benchmark for
  testing whether language and vision-language models can distinguish
  potential common ground from grounded agreement.

The page follows the familiar single-paper project-page format—title, authors,
paper/data/code links, overview, results, publications, and citation—while
making the research example directly explorable. It is a static,
dependency-free site suitable for GitHub Pages.

## Interactive research example

The explorer combines three separately attributed layers:

1. **HCRC MapTask source material:** authentic route-giver and route-follower
   maps plus short dialogue excerpts;
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

This site uses short research excerpts only. It does **not** include HCRC
MapTask audio or video. See [NOTICE.md](NOTICE.md) for source attribution,
modification notes, and the license that applies to each layer.

## Run locally

No package installation or build step is required for the checked-in site:

```bash
cd /path/to/gmmt-vis
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/>. Do not open `index.html` directly: browsers
normally block the local `fetch()` used to load the demo data.

## Rebuild the annotation and prediction extract

The checked-in demo JSON is generated from a local GMMT release and the SINS
experiment outputs:

```bash
node scripts/build-demo-data.mjs \
  --gmmt /path/to/grounded-misunderstandings-in-maptask \
  --experiments /path/to/maptask-perspective-taking \
  --out data/demo-data.json
```

The generator keeps the two kinds of model output distinct:

- GMMT's GPT-5 layer infers and annotates each participant's landmark interpretation;
- SINS predictions answer whether the two interpretations match—they do not
  predict the landmark IDs themselves.

The human-verified toggle is available only for the selected verified examples.
The rebuild command does not download HCRC source material; map assets and
dialogue excerpts must be prepared from an independently obtained copy of the
official corpus and attributed as described in [NOTICE.md](NOTICE.md).

## Checks

Run the JavaScript syntax checks before publishing:

```bash
node --check app.js
node --check scripts/build-demo-data.mjs
```

Then serve the site locally and verify that:

- the paper, dataset, and code links open correctly;
- changing examples updates both maps and the adjacent dialogue;
- landmark hotspots are keyboard-accessible and update both interpretations;
- model names and map-access conditions match the underlying prediction; and
- desktop and narrow mobile layouts have no clipped controls or horizontal
  overflow.

## Publish at `gmmt-vis.github.io`

For the requested organization-root URL, both GitHub names are significant:

- the GitHub organization must be named **`gmmt-vis`**; and
- this repository must be named exactly **`gmmt-vis.github.io`**.

That combination publishes at <https://gmmt-vis.github.io/>. A repository named
`gmmt-vis` would instead be a project site below an organization URL, not the
organization's root Pages site.

After pushing the `main` branch, open **Settings → Pages → Build and
deployment**, select **GitHub Actions**, and run the included Pages workflow (or
push another commit to `main`). Relative asset paths are used throughout.

## Provenance and source resources

- [Official HCRC MapTask v2.1 download page](https://groups.inf.ed.ac.uk/maptask/maptasknxt.html)
- [GMMT on GitHub](https://github.com/chnln/grounded-misunderstandings-in-maptask)
- [GMMT on Hugging Face](https://huggingface.co/datasets/chnln/grounded-misunderstandings-in-maptask)
- [SINS on GitHub](https://github.com/chnln/seeing-is-not-sharing)
- [SINS on Hugging Face](https://huggingface.co/datasets/chnln/seeing-is-not-sharing)

## Citations

Please cite the original corpus and the relevant dataset paper(s):

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

## License

The MIT license in [LICENSE](LICENSE) covers only original website software.
HCRC source material and GMMT/SINS research content keep their own licenses;
see [NOTICE.md](NOTICE.md). Cloning or publishing this repository does not merge
those materials into a single MIT-licensed work.

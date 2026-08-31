# MapTask Vis v0.1.0

First release of **Grounded Interpretations in MapTask**, the interactive
project homepage and corpus browser for GMMT (LREC 2026) and SINS (SIGDIAL 2026).

- [Project homepage](https://chnln.github.io/maptask-vis/)
- [Full corpus browser](https://chnln.github.io/maptask-vis/explorer.html)

## Included

- All 128 MapTask dialogues, 16 map pairs, and 13,077 reference annotations.
- 431 clickable physical landmark regions, linked to reference mentions and
  giver/follower interpretations; map enlargement on both pages.
- Four landmark-discrepancy examples, including the parked-van example.
- GPT-5 annotations by default, with a separate human-verified layer for
  three dialogues (504 references).
- Saved Qwen3-VL-8B-Instruct SINS judgments with explicit evidence conditions.
- Source/licence notices, README local-serving instructions, and CITATION.bib.
- Dependency-free checks and automated GitHub Pages deployment.

## Downloads

- **maptask-vis-v0.1.0-offline.zip**: extract and keep `preview.html` and
  `explorer-preview.html` together. Open `preview.html` for an offline view.
  If your browser blocks local-file navigation, serve the extracted directory
  using `python3 -m http.server 4173 --bind 127.0.0.1` and visit
  `http://127.0.0.1:4173/preview.html`.
- **maptask-vis-v0.1.0-site.zip**: the exact static website files used for
  deployment. Serve the extracted directory with the same Python command
  and visit `http://127.0.0.1:4173/`.
- **SHA256SUMS.txt**: checksums for both ZIP downloads.
- GitHub's source-code archives contain the repository at this release tag.

## Scope and limitations

This is a visualization software release, not a new GMMT/SINS dataset version.
The site displays saved annotations and judgments; it does not run models.
Hotspots are AI-assisted visual estimates for navigation, not human-verified
gold bounding boxes. Six GPT-5 interpretation fields across four references
point to the absent `m2_stone_creek@f` map counterpart; these source IDs are
preserved and explicitly reported.

Website software is MIT-licensed. HCRC MapTask maps/transcripts and GMMT/SINS
research data retain their separate CC BY 4.0 attribution and modification
notices. See NOTICE.md, CREDITS.md, and CITATION.bib in the downloads.

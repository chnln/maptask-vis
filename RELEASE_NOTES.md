# MapTask Vis v0.1.1

Patch release of **Grounded Interpretations in MapTask**, the interactive
project homepage and corpus browser for GMMT (LREC 2026) and SINS (SIGDIAL
2026).

- [Project homepage](https://chnln.github.io/maptask-vis/)
- [Full corpus browser](https://chnln.github.io/maptask-vis/explorer.html)

## Changes since v0.1.0

- Synchronised corpus navigation in both directions: selecting a transcript
  reference now updates the landmark, mention list, detail panel, and URL, just
  as selecting a landmark mention already updated the transcript.
- Added a display-layer correction for 468 released reference spans containing
  706 timed units from the other speaker. The original released expression and
  excluded units remain disclosed in the UI data; source annotations are not
  silently rewritten.
- Restored verbatim research questions from the two papers and refined the
  abstract, discrepancy example, corpus-browser introduction, affiliation,
  author link, and top-level Code & Data navigation.
- Expanded regression checks for cross-speaker filtering and bidirectional
  landmark/reference selection.

## Downloads

- **maptask-vis-v0.1.1-offline.zip**: extract and keep `preview.html` and
  `explorer-preview.html` together. Open `preview.html` for an offline view.
  If your browser blocks local-file navigation, serve the extracted directory
  using `python3 -m http.server 4173 --bind 127.0.0.1` and visit
  `http://127.0.0.1:4173/preview.html`.
- **maptask-vis-v0.1.1-site.zip**: the exact static website files used for
  deployment. Serve the extracted directory with the same Python command and
  visit `http://127.0.0.1:4173/`.
- **SHA256SUMS.txt**: checksums for both ZIP downloads.
- GitHub's source-code archives contain the repository at this release tag.

## Scope and limitations

This is a visualization software release, not a new GMMT/SINS dataset version.
The site displays saved annotations and judgments; it does not run models.
The cross-speaker correction is limited to transcript highlighting and display
text. It does not recompute interpretations, understanding states, rationales,
or SINS predictions that may have consumed the released expressions.

Five source timed units also have high-confidence utterance-ID outliers. Their
chronological positions are retained, but ID-based prompt slicing may omit an
acknowledgement or expose a future token. These source records and downstream
annotations remain unchanged in v0.1.1 pending a coordinated data repair.

Hotspots are AI-assisted visual estimates for navigation, not human-verified
gold bounding boxes. Six GPT-5 interpretation fields across four references
point to the absent `m2_stone_creek@f` map counterpart; these source IDs are
preserved and explicitly reported.

Website software is MIT-licensed. HCRC MapTask maps/transcripts and GMMT/SINS
research data retain their separate CC BY 4.0 attribution and modification
notices. See NOTICE.md, CREDITS.md, and CITATION.bib in the downloads.

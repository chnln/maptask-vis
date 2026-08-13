# Credits, licences, and source records

The interactive demo combines material with different owners and licences.
Licences apply per component; no licence entry below transfers ownership of one
component to another.

Source and licence information was checked on **2026-08-13**.

## HCRC Map Task Corpus

The six map images and the spoken words in the three short dialogue excerpts
come from the **HCRC Map Task Corpus Annotations Version 2.1**, Human
Communication Research Centre, University of Edinburgh & University of
Glasgow, copyright © 2007 Human Communication Research Centre.

- Official corpus download page:
  <https://groups.inf.ed.ac.uk/maptask/maptasknxt.html>
- Official corpus overview: <https://groups.inf.ed.ac.uk/maptask/>
- Licence: [Creative Commons Attribution 4.0 International
  (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

The official download page states that the downloads on that page, including
the annotations/transcription and accompanying maps, are CC BY 4.0.

Please cite the source corpus:

> Anne H. Anderson, Miles Bader, Ellen Gurman Bard, Elizabeth Boyle, Gwyneth
> Doherty, Simon Garrod, Stephen Isard, Jacqueline Kowtko, Jan McAllister, Jim
> Miller, Catherine Sotillo, Henry S. Thompson, and Regina Weinert. 1991. The
> HCRC Map Task Corpus. *Language and Speech*, 34(4), 351–366.
> <https://doi.org/10.1177/002383099103400404>

### Modifications and presentation

- The source map scans were previously converted to RGB PNG and resized to a
  1024-pixel maximum side by the SINS preprocessing workspace. The files used
  here are 791 × 1024 pixels.
- This repository copied those six resized PNG byte-for-byte; it did not crop,
  recolour, retouch, or draw markers into the images.
- Click targets and prediction highlights are separate HTML/CSS overlays. Their
  image-relative coordinates are recorded in `data/hotspots.json`.
- The dialogue excerpts preserve the transcript wording and line order. Only
  the internal `<< … id:… lm:… >>` display markup was removed. Unified
  reference IDs are retained separately as structured metadata.
- No HCRC audio or participant-identifying material is included.

## GMMT

Unified reference IDs, participant-interpretation annotations, and derived
metadata are from **Grounded Misunderstandings in MapTask (GMMT)**, copyright
© 2026 Nan Li, Albert Gatt, and Massimo Poesio, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- Dataset/code repository:
  <https://github.com/chnln/grounded-misunderstandings-in-maptask>
- Dataset record:
  <https://huggingface.co/datasets/chnln/grounded-misunderstandings-in-maptask>

Please cite:

> Nan Li, Albert Gatt, and Massimo Poesio. 2026. Grounded Misunderstandings in
> Asymmetric Dialogue: A Perspectivist Annotation Scheme for MapTask. In
> *Proceedings of the Fifteenth Language Resources and Evaluation Conference
> (LREC 2026)*. <https://doi.org/10.63317/59anbt78wyj7>

## SINS

The model common-ground predictions shown by the website are curated outputs
from **Seeing Is Not Sharing (SINS)**. SINS dataset data are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); SINS software is
licensed under the MIT License.

- Dataset/code repository: <https://github.com/chnln/seeing-is-not-sharing>
- Dataset record:
  <https://huggingface.co/datasets/chnln/seeing-is-not-sharing>

Please cite:

> Nan Li, Albert Gatt, and Massimo Poesio. 2026. Seeing Is Not Sharing: Some
> Vision-Language Models Overestimate Common Ground in Asymmetric Dialogue. In
> *Proceedings of SIGDIAL 2026*.
> <https://aclanthology.org/2026.sigdial-1.49/>

## Included map-file integrity record

These hashes identify the exact resized images reviewed for the demo:

| File | Role | SHA-256 |
| --- | --- | --- |
| `static/images/maps/map6g.png` | Map 6 giver | `e91673ac9be2ec4dd2a729a119fddb9726f2e02db9125a9cb9ef77584bfb4cfe` |
| `static/images/maps/map6f.png` | Map 6 follower | `855f33d7a734e8751f445c411c434556201f07caf18d271d8c46aa1b5054d0e0` |
| `static/images/maps/map9g.png` | Map 9 giver | `58deca52af25cc0e5871d56db98d6ec549210a64b2598b08379bbd15c962e80b` |
| `static/images/maps/map9f.png` | Map 9 follower | `52152cc4b6a885070ab92ec0eaa3631d988415211108b9c98d6f41041ffaa0f6` |
| `static/images/maps/map12g.png` | Map 12 giver | `6bfe38398e13602422e46d8185711dc36844dc9bfba666730e10c76e7f4ac9ca` |
| `static/images/maps/map12f.png` | Map 12 follower | `166c82e3bab70ab1b13476f97f55f95e9e074d72de02bf589719ab3963f8ee42` |

The source copies for all six files were taken from
`maptask-perspective-taking/data/rawdata/resized_png/max-side-1024px/` in the
local research workspace.

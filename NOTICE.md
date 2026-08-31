# Data, content, and software notices

This repository is a collection of independently licensed materials. The MIT
license in `LICENSE` applies only to original website software; it does not
relicense corpus content, datasets, model outputs, papers, names, or logos.

## License layers

| Material used by the site | Source | Applicable terms |
| --- | --- | --- |
| Authentic maps and dialogue transcripts | HCRC Map Task Corpus Annotations v2.1, Human Communication Research Centre, University of Edinburgh and University of Glasgow, © 2007 Human Communication Research Centre | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as stated for downloads on the [official HCRC download page](https://groups.inf.ed.ac.uk/maptask/maptasknxt.html) (checked 31 August 2026) |
| Perspectivist landmark interpretations, reference-expression annotations, schemas, and derived metadata | Grounded Misunderstandings in MapTask (GMMT), Nan Li, Albert Gatt, and Massimo Poesio | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Interpretation-matching records and released result extracts | Seeing Is Not Sharing (SINS), Nan Li, Albert Gatt, and Massimo Poesio | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Original HTML, CSS, JavaScript, and repository scripts written for this site | GMMT × SINS project page contributors | MIT; see `LICENSE` |

The upstream SINS **code** also has an MIT license, but that upstream license is
separate from this repository's license. Third-party libraries or assets, if
added later, retain their own notices and must not be assumed to be MIT merely
because they appear in this repository.

## Why maps and dialogue can be shown

Serving a map image or dialogue excerpt on a public web page is “Share”—copying
and redistributing the material in a medium or format—under CC BY 4.0. It is
therefore not outside the license merely because a visitor views it in a
browser. CC BY 4.0 expressly permits sharing and adaptation for any purpose,
provided the project gives appropriate credit, links to the license, indicates
whether changes were made, and does not impose additional restrictions.

This notice is intended to satisfy those conditions for the included HCRC,
GMMT, and SINS material. It is not a substitute for reading the licenses or for
legal advice.

## Attribution and changes

### HCRC MapTask

Suggested attribution:

> HCRC Map Task Corpus Annotations Version 2.1, Human Communication Research
> Centre, University of Edinburgh and University of Glasgow, © 2007 Human
> Communication Research Centre. Obtained from the official HCRC MapTask
> download page and used under CC BY 4.0.

Changes made for this site: selected official full-size PostScript maps were
converted to PNG and proportionally downscaled so that the longest edge is at
most 1024 pixels. They are not cropped and their depicted content is not
edited. Clickable landmark hotspots, selection states, and highlights are
separate HTML overlays added by the project page; they are not part of the
original maps.

The homepage presents a moving context window around the selected reference;
the corpus browser presents all 128 transcripts. Text is reconstructed from
preprocessed timed units (verified against the original XML), with reference
spans anchored by the released timed-unit IDs. Original words, chronological
line order, speaker roles and utterance IDs are retained; whitespace is
normalised. Clickable highlights and reference-ID buttons are added. Text may
be reflowed to fit the interface. The four existence/lexical/multiplicity/
identical gallery overlays are explanatory, not model outputs.
No semantic changes to the quoted dialogue are intended.

The page must not state or imply that HCRC, the University of Edinburgh, the
University of Glasgow, the corpus authors, or any participant endorses this
project or its model-generated interpretations.

The site does not host or use MapTask video. The HCRC corpus website explains
that its subject videos were never made freely available for download in order
to protect participant privacy. This project also does not publish corpus audio.

### GMMT and SINS

The site reformats the full released annotation layer, attaches
human-readable labels, and joins GMMT interpretation records to SINS model
judgments by reference ID. Interactive filtering, hotspot coordinates, color
coding, and model/source badges are project-page additions. The underlying
annotations and judgments are not presented as newly authored website code.

Model-generated interpretations are labelled with their model. Human-verified
records are labelled separately. A SINS Yes/No prediction is an
interpretation-matching judgment and must not be described as the model's own
prediction of the giver and follower landmark IDs.

## Citation request

Publications, screenshots, or derivatives based on this visualization should
cite:

1. Anderson, Anne H., et al. (1991). “The HCRC Map Task Corpus.” *Language and
   Speech*, 34(4), 351–366. <https://doi.org/10.1177/002383099103400404>
2. Li, Nan; Gatt, Albert; and Poesio, Massimo (2026). “Grounded
   Misunderstandings in Asymmetric Dialogue: A Perspectivist Annotation Scheme
   for MapTask.” *Proceedings of LREC 2026*, 4988–5001.
   <https://doi.org/10.63317/59anbt78wyj7>
3. Li, Nan; Gatt, Albert; and Poesio, Massimo (2026). “Seeing Is Not Sharing:
   Some Vision-Language Models Overestimate Common Ground in Asymmetric
   Dialogue.” *Proceedings of SIGDIAL 2026*, 694–710.
   <https://aclanthology.org/2026.sigdial-1.49/>

## Downstream use

Anyone who copies, republishes, or adapts the corpus-derived files must preserve
the relevant attribution, license link, and modification notice. Do not remove
source metadata, add technological restrictions that prevent recipients from
exercising CC BY 4.0 rights, or use attribution in a way that suggests
endorsement.

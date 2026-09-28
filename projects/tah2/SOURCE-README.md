# TaH2 project page

Static research website, organized like `../TaH_webpage`.

## Preview

Open `index.html`, or run `python3 -m http.server 4173` from this directory.

## Structure

- `index.html`: page content and citation.
- `static/css/index.css`: styles, including Team and Citation styles matched to TaH.
- `static/js/index.js`: interactive charts, animations and controls.
- `static/js/data.js`: chart data and token-depth examples.
- `static/images/`: favicon and SVG figures.
- `static/pdf/`: paper and original figure PDFs.
- `.openai/hosting.json`: hosting configuration, serving the project root.

## Content

TaH2 authors and results come from `../paper/6a6e03828a2d15fed1281a72/`. Numerical data retain their source annotations in `static/js/data.js`; visible captions focus on the main takeaway without paper figure or appendix references. Author order, affiliations, links, and citation metadata remain specific to TaH2.

The page includes animated compute and depth scaling, training loss, serving latency, token-level depth, and 4B/8B benchmark comparisons. The paired test-time scaling and training-loss charts share one animation clock and Pause button. Token text and depth colors reveal together, with a static depth legend and a separate pause control. Beginning and Ending use shared grid rows across the three examples; paper-reported mean depths appear after their segment completes. PDF-extracted equal-depth text runs are subdivided into word-sized animation pieces, without treating those pieces as tokenizer boundaries or recomputing the reported means. Controls also support batch-size and model-size selection. Reduced-motion preferences show static final frames.

Chart plotting areas follow the source PDF axis ratios: TTS panels 1.568688:1, training loss 1.541596:1, and introductory/latency charts 1.419528:1. SVG coordinates and rendered aspect ratios are updated together. All content remains in the shared 980px column with 24px horizontal padding.

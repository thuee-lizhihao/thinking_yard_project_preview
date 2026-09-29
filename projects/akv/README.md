# AKV · Cache Engineering for Agents

First local draft, added to the shared project registry under Context Scaling / Route 03.

## Content sources

- Research narrative and operations: supplied `ICLR2027_AKV/tex/0_abstract.tex`, `1_intro.tex`, and `3_method.tex`.
- Benchmark values, latency, and throughput: `tex/4_experiment.tex`. Model selectors reproduce the table values and rounded averages. The 27.7% and +1.7-point headlines follow the manuscript; do not derive the former from rounded average costs.
- RSI: 17.8% lower cost **relative to Standard**, for MiniMax-M2.7 on BrowseComp-Plus at search iteration 6. This is a separate experiment, not an additional reduction applied to 27.7%.
- Paper figures: original manuscript PDFs, rendered to SVG without redrawing. SVG conversion respects the PDF crop box to omit blank page margins. Original PDFs remain in the source assets for reference; the page omits original-figure links and the Figure 9(a) data-download link.
- Radix-tree explainer: `static/figures/radix-tree.svg` is a simplified vector schematic of trajectories 1 and 2 in `figure/trajectory.pdf`, grounded in `3_method.tex` (drop-aware reuse and eviction). It shows shared A–B, branch-specific C states, and drop markers. The captions distinguish logical dropping from physical eviction and note position-aware reuse for Repos.
- Logo: the supplied `logo.jpg`, copied unchanged to `shared/assets/akv.jpg`.
- Figure 9(a): supplied `48c14-96c12-kv96c14.csv`, 918 records, 3 methods × 3 repeats, 100 tasks per run.

## Page narrative

The page introduces the idea before the evidence: cache engineering → serving design → serving replay → benchmark evidence → policy learning. The hero uses the shared full-viewport layout, a text-only project title, one subtitle, and three headline metrics. The logo is reserved for project menus, hub cards, and the favicon. Navigation, footer, back-to-top, and citation controls come from the shared site components; do not add local copies.

The core comparison figure stays visible in the overview, followed by the optional append / drop / reposition demo at `#method`. Below the three **Serving Design** contributions, the radix-tree explainer and full token-prefix explanation appear as two adjacent disclosures. Both start collapsed; the radix-tree disclosure retains the `#radix-tree` anchor. That chapter explains the history-dependence challenge and the reuse / eviction / restoration contributions. The GPU-hour replay remains a separate experiment section. API request JSON and parameter grammar are omitted; repeated overview and rolling-drop explanations are condensed.

## Hero cache flow

`static/js/hero-flow.js` draws a decorative, schematic history/KV flow in paired rows behind the hero. A 12-second cycle appends new messages and states, drops selected KV only, repositions retained states, and continues generation. Internal patterns retain their identities. The logical-history viewport advances at the end of each cycle; it does not delete messages. The background uses a muted neutral-gray palette and contains no labels or numeric indices. Repositioning is illustrated by the movement of retained blocks, not a physical-memory layout.

Clicking a background KV segment fades out its nearby states while the message history remains unchanged. Hovering gently emphasizes the target segment. The background pauses outside the hero and in hidden tabs; there is no pause button. Reduced-motion users get a static post-reposition snapshot. Rendering is capped at 30 fps and device pixel ratio 2. The central fade keeps the title, copy, metrics, and links readable. No simulated performance numbers are displayed.

## Figure 9(a) replay

Rebuild the web data with:

```sh
python3 scripts/prepare-akv-data.py ../48c14-96c12-kv96c14.csv
```

The generator preserves adjusted elapsed times and computes GPU hours as `elapsed_seconds * 8 / 3600`. The CSV already divides original times by 1.13 (Standard), 1.0788 (Text Engineering), or 1.0 (AKV). No second adjustment is applied.

Each run is a right-continuous step function. The mean is calculated at the union of event times, holding each run's final score after it completes. Shading is the **min–max range**, not a confidence interval. Mean final scores are 40.6667%, 32.3333%, and 47.0%, respectively. Concurrency differs: Standard C=12, Text Engineering C=14, AKV C=14.

Public CSV contains only the plotting and timing fields; internal paths, timestamps, execution IDs and experiment identifiers are omitted. The original source is unchanged outside this repository.

Replay loops automatically while visible, drawing for 12 seconds and holding the completed curves for 3.5 seconds. The figure always shows the mean of all three runs, with a compact pause/resume control. Reduced-motion users see the complete plot. Playback suspends outside the viewport or while the document is hidden and resumes on return. Timing normalization remains documented here rather than in the public-facing page.

Benchmark results use TaH2-style grouped bars for all three methods, with model and Accuracy/Cost selectors. Axes start at zero; accuracy uses a fixed 0–100% scale. The full numeric table is available in a collapsed disclosure.

## Pending release details

Per the owner's instruction, authors, paper URL, code URL, and citation are intentionally unfilled. `citation.bib` is empty and its required shared citation slot is hidden until details are supplied. No fabricated author or publication information is included. Add actual links and author pills to `content.html`, populate `citation.bib`, and unhide the citation slot at release.

## Editing / preview

Edit `content.html`, `page.json`, and `static/css/index.css`. Interactive behavior and benchmark table data live in `static/js/index.js`; replay math is in `static/js/replay-math.js`.

```sh
npm run check
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true npm run preview
# http://127.0.0.1:3002/thinking_yard_project_page/projects/akv/
```

The registry automatically includes AKV in the hub and shared navigation. No deployment or push is needed for local review.

# TaH2 project page

Integrated from the sibling `tah2-project-page/` directory. The original is unchanged; its README is preserved as `SOURCE-README.md` for scientific data provenance.

## Site integration

- Route: `/projects/tah2/` (deployment prefix is added by the generator).
- Category: Adaptivity Scaling; hub route: `03` (a new scaling dimension through learned token-level depth).
- Registration and logo: `config/projects.json` and `shared/assets/tah2.png`.
- Uses the shared research theme, navigation, grouped contents menu, back-to-top, citation card, CTA buttons, author pills and footer.
- `page.json` defines Research / Evaluation / Resources entries. `runtime-figure` and `depth-figure` link to subsections within Results.

## Editing

Edit `content.html` for research copy and structure, `citation.bib` for the citation, and `static/css/index.css` only for project-specific charts/layout. Do not copy navigation or shared UI logic into this project. Keep each full-width `.section` separate from its inner `.container`: section padding and background come from the shared theme, while the container only limits content width. Do not put a zero-vertical-padding wrapper on the section itself.

The original `static/js/data.js`, paper, PDF figures and scientific SVGs were copied unchanged. `static/js/index.js` retains chart animation, model/batch controls, token-depth demonstrations and reduced-motion support; citation copying is handled by the shared controller. Do not adjust plotted data, ratios or chart geometry merely for styling.

The architecture diagram and nine-benchmark figure scroll horizontally on narrow screens to keep labels legible. Other charts stack within the page width.

From the repository root, run `npm run check` and `GITHUB_PAGES=true npm run build`; then `GITHUB_PAGES=true npm run preview`. Check desktop/mobile layout and model, batch, animation, citation and navigation controls after changes.

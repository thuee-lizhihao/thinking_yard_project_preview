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

## Hero background

`static/js/hero-iterations.js` draws a decorative field of iteration trials: points grow branches away from their parent paths. Some trials retract to their origins; others keep extending along the new branch without merging back. Each trial starts at the exact endpoint of the preceding one. Accepted branch displacement carries forward, and particles restart only beyond the viewport edges. The canvas starts empty: paths are drawn only up to the moving tip, and completed trails fade over 24 seconds. No full guide lines or unvisited nodes are prepainted. These paths illustrate the idea and are not experimental data. The canvas sits behind a central white veil and never intercepts links. It pauses offscreen or in a hidden tab, caps pixel density and frame rate, and uses a static composition for reduced-motion preferences. Its styling lives at the end of the project stylesheet.

## Demo video

`static/videos/tah2-demo.mp4` is a lossless MP4 remux of the supplied `demo.qt` (29.4 seconds, 764 × 504, H.264 video and AAC audio). Both media streams are preserved, with MP4 metadata moved to the front for progressive playback. `tah2-demo-poster.jpg` is extracted at 22 seconds. The Method section is followed by a Demo section, linked from the hero and the shared contents menu. The native player uses `controls`, `playsinline` and `preload="none"`; playback starts only on user interaction.

To replace the video: `ffmpeg -i demo.qt -map 0:v:0 -map '0:a?' -c copy -map_metadata -1 -movflags +faststart static/videos/tah2-demo.mp4`. Regenerate the poster from the replacement video and update the intrinsic width/height and CSS aspect ratio if its dimensions change.

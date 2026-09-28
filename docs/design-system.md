# Shared visual system

Derived from the workspace's `alpha_design_system` and approved C2C prototype.

- Apple system font stack first; body 17px / 1.47, near-black #1d1d1f.
- White / #fbfbfd canvas, #f5f5f7 section surface, #0071e3 blue controls.
- Reserve the 135-degree #667eea → #764ba2 gradient for project titles, research stats and active project tint.
- Hero title clamp(48px, 8vw, 96px); section title clamp(32px, 5vw, 56px).
- Default/wide container variables: 980px / 1200px. Section rhythm: 100px vertical padding.
- Pill CTAs, softly rounded figures/cards, restrained shadows; no decorative stock imagery.
- Scientific content remains precise and declarative; preserve the authors' claims and numbers.

`shared/styles/tokens.css` is the maintained token source. The three research pages share `research.css`; all five share `components.css`. Project overrides load after shared primitives. Modifier selectors (for example `.btn.btn-secondary` and `.section.section-dark`) are intentionally more specific than base selectors, preserving appearance when shared rules move earlier in the cascade.

Navigation is entirely namespaced with `sp-` so Bulma and project-specific styles cannot change it. Its complete markup is generated at build time by `shared/navigation/render.mjs`, including in the Next.js hub. `controller.js` adds behavior without fetching a registry at runtime. The local copies in `shared/assets` make menu logos independent of old repository hosts.

## Dependencies preserved during migration

FrameFusion retains its legacy carousel / slider and Font Awesome runtime dependencies because its interactive demonstrations use them. Its project CSS already overrides the old template appearance. Other papers retain MathJax, PapaParse or their own scripts where needed. Migrating this code does not require rewriting working scientific demonstrations into React.

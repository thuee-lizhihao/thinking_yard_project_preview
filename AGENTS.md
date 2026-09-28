# Repository guide

This is the unified Thinking Yard / NICS-EFC research site. Work only in source directories. `public/` and `out/` are generated and ignored. Do not introduce nested Git repositories or submodules.

## Single sources of truth

- Project names, descriptions, category membership, logos and routes: `config/projects.json`.
- Category labels: `config/categories.json`.
- All navigation markup, state and styling: `shared/navigation/`.
- Visual tokens: `shared/styles/tokens.css`; common components: `shared/styles/components.css` and `research.css`.
- Read `docs/design-system.md` before broad visual changes.
- A project contains `page.json`, `head.html`, `content.html`, and `static/`. Do not duplicate navigation or embed another project registry in it.

## Approved navigation

- At page top, Home always returns to the local hub.
- At >=900px, three categories are centered and open on mouse hover; the panel keeps the project's logo and description. Delay pointer-leave dismissal by 180ms so crossing into the panel works. Keep click and keyboard access.
- Narrow/touch layouts use All projects with the same three groups.
- After scrolling more than 8px, retract global navigation. The local bar contains only the project title and On this page, with a section dropdown.
- Bar labels use one 13px token; the project title is distinguished by weight. Controls have 44px tap height.
- Use restrained entrance animation and respect reduced motion.

## Preservation and verification

Preserve paper content, authors, figures, tables, video and project-specific interactions. In particular: C2C CSV filtering, R2R token demo/video, FrameFusion charts/video/CSV, MoA matrix interactions, and the hub's curve math.

Run `npm run check` and `GITHUB_PAGES=true npm run build` for changes to shared rendering, configuration, or routing. Check desktop and mobile when changing visuals. The validator checks local resources and anchors; browser testing checks runtime data and layout. No deployment is needed for routine local changes unless requested.

Use `npm run new:project -- slug "Name" category` to scaffold additions. Keep deployment base paths configurable. Links between project pages must resolve inside this site. External paper/code/author links stay external.

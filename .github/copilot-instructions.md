# Copilot Instructions for `smit4k.github.io`

## Build, test, and lint commands

- This repository currently has **no configured build, test, or lint tooling** (no `package.json`, Makefile, or test runner config).
- There is no single-test command available because no automated test suite is defined.
- For manual local verification, serve the static site from the repo root (example):
  - `python3 -m http.server 4000`
  - then open `http://localhost:4000/`

## High-level architecture

- This is a single-page static GitHub Pages site.
- `index.html` is the source of page structure/content and also contains inline theme bootstrapping logic.
- `stylesheets/styles.css` is the main visual system:
  - layout and responsive behavior
  - light/dark theme tokens via CSS custom properties
  - dark mode behavior driven by `html[data-theme="dark"]` and `prefers-color-scheme` fallbacks
- `stylesheets/pygment_trac.css` provides syntax highlighting styles and mirrors dark-mode behavior with `[data-theme="dark"]` and media-query overrides.
- `javascripts/scale.fix.js` is a legacy iPhone viewport scaling fix loaded at the end of `index.html`.
- `README.md` documents that this site is derived from GitHub Pages’ Minimal theme and includes licensing context.

## Key conventions in this repo

- Theme state is controlled by the `data-theme` attribute on `<html>` and persisted in `localStorage` under the key `theme`; keep this contract stable when editing theme behavior.
- Dark mode is implemented in **both** main styles and syntax-highlighting styles; update `styles.css` and `pygment_trac.css` together for theme-related changes.
- The site is intentionally dependency-free and static; prefer direct edits to HTML/CSS/vanilla JS over introducing build steps or framework tooling unless explicitly requested.
- Keep the existing fixed-sidebar Minimal-theme layout model (`header`/`section`/`footer` widths and media-query breakpoints) unless a layout redesign is requested.

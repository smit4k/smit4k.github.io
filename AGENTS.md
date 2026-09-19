# Repository guidance

## Purpose and stack

This is Smit Patil's personal homepage and writing site at `https://smitp.cc`.
It uses Zola, Tera templates, plain CSS, and vanilla JavaScript modules. CI pins
Zola **0.22.1**. There is no Node package manifest or bundler. Admonition rendering
has a shell-based regression check that runs Zola directly.
Do not introduce a framework or package manager for routine site changes.

## Source map

- `zola.toml`: site identity, production URL, RSS, search-index generation, and syntax highlighting.
- `content/writing/_index.md`: writing section, date ordering, and template selection.
- `content/writing/*.md`: posts with YAML front matter (`title`, `date`, `description`); existing posts also carry `tags` and `links`. The section uses TOML front matter.
- `templates/base.html`: shared document shell, stylesheet, and module scripts.
- `templates/index.html`: homepage, decorative banner, and three latest posts.
- `templates/writing.html`: archive grouped by year.
- `templates/writing-page.html`: article header, metadata, and content.
- `templates/macros/`: shared breadcrumbs, post metadata, and admonition rendering.
- `templates/rss.xml`: RSS feed using the same admonition renderer as posts.
- `templates/404.html`: not-found page.
- `static/site.css`: layout, typography, theme variables, and responsive rules.
- `static/code-copy.js` and `static/heading-links.js`: progressive enhancements.
- `static/`: assets copied into the output root, including local fonts and images.
- `.github/workflows/deploy.yml`: builds `public/` and deploys to GitHub Pages on pushes to `main` or manual dispatch.
- `CNAME`: production domain declaration at repository root; Zola does not copy this file into `public/` automatically.

## Work and validation

Run from the repository root:

```sh
zola --version
zola check --skip-external-links
zola build
zola serve
sh tests/admonitions.sh
```

Use Zola 0.22.1 to match CI. `zola serve` provides the local preview, normally at
`http://127.0.0.1:1111`. Serving the repository root with a generic HTTP server
does not render this site. `public/` is generated and ignored; edit source files.
For output outside the checkout, use `zola build --output-dir /tmp/smit-site-preview`
with a fresh destination. `zola check` also checks external links and needs network access;
report network failures separately from site defects.

After JavaScript changes, run `node --check static/code-copy.js` and
`node --check static/heading-links.js` if Node is available. These check syntax,
not browser behavior. For template, CSS, or script changes, inspect the homepage,
writing archive, a post with code, and `/404.html` in a browser. Check narrow and
wide viewports, both system color schemes, keyboard focus, heading anchors,
clipboard success/failure, and image/code overflow. Verify RSS and local assets
after content or URL changes. Report checks actually performed and any gaps.

## Conventions

- Preserve the compact, typography-focused layout, locally hosted fonts, and
  system-driven light/dark colors unless a redesign is requested. Theme tokens
  live in `:root` and `prefers-color-scheme: light`; there is no theme toggle or
  `localStorage` theme contract.
- Use Tera `get_url` for template assets and internal destinations, and Zola
  content references such as `@/writing/_index.md`. Existing CSS font URLs and
  Markdown image URLs assume deployment at the domain root.
- Keep post filenames, dates, and permalinks stable unless the task calls for
  changes. Preserve the author's voice and factual claims when editing prose.
- Keep shared markup in the existing base template and macros. Maintain
  semantic headings, useful image alt text, visible keyboard focus, and readable
  colors in both themes. Check generated syntax colors alongside CSS backgrounds.
- Keep core reading and navigation usable without JavaScript. Copy controls
  should only report success when copying succeeds.
- Do not edit generated HTML, move deployment bookmarks, or publish changes
  unless requested. Preserve unrelated working-copy changes.
- This checkout contains `.jj/` alongside `.git/`: use Jujutsu for version control.
  Use `jj --no-pager status` and `jj --no-pager diff --git` for inspection; avoid
  raw Git mutations. Describe an empty change before editing; if the current
  change already contains work, create a separate change without discarding it.

## Documentation caveats

`.github/copilot-instructions.md` describes a previous single-page Minimal-theme
implementation and references files that no longer exist. Use the actual Zola
sources and this guide for the current architecture. See `AUDIT.md` for the
2026-09-13 audit; recheck those findings before treating them as current defects.

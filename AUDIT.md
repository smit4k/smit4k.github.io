# Site audit — 2026-09-13

Scope: local source, deployment configuration, and generated Zola output.
No live deployment, browser interaction, external-link availability, or performance
benchmark was tested. This audit records findings; it does not change site behavior.

## Findings

1. **High — mobile viewport configuration is missing.** `templates/base.html`
   has no viewport meta tag. Mobile browsers can use a desktop-sized layout
   viewport, preventing the intended 40rem and 36rem CSS breakpoints from behaving
   as expected. Add `width=device-width, initial-scale=1` and verify on mobile.

2. **High — code text has poor contrast in light mode.** Generated code blocks
   in `/writing/making-of-lqf/` have inline text color `#CDD6F4`. `static/site.css`
   overrides their background with `!important`, using `#f7f7f7` in light mode.
   This pair has approximately 1.35:1 contrast. Coordinate highlighting colors
   and backgrounds for both themes, then check all token colors.

3. **Medium — every page has the same browser title and lacks descriptive metadata.**
   `templates/base.html` hardcodes `Smit's Blog` and emits no meta description,
   canonical URL, or social-preview metadata. Use page/section title and description
   with configuration fallbacks. RSS exists but has no head-level autodiscovery link.

4. **Medium — agent instructions describe a removed architecture.**
   `.github/copilot-instructions.md` claims there is no build tooling and directs
   edits to nonexistent files such as `stylesheets/styles.css`. It should be
   replaced with current Zola guidance or a pointer to `AGENTS.md`.

5. **Medium — clipboard errors are not handled.** `static/code-copy.js` awaits
   the Clipboard API without a catch, so denial produces an unhandled rejection
   without user feedback. Its fallback ignores the boolean return from
   `document.execCommand("copy")`, allowing a false success label. Handle both
   failure paths and expose accessible status feedback.

6. **Medium — main landmarks are absent on the principal pages.** Only the 404
   template uses `<main>`. Add one main landmark to home, archive, and article
   pages without nesting the existing 404 landmark. The archive also jumps from
   h1 to h3 for year headings; use h2. Breadcrumb current-page links should carry
   `aria-current="page"`.

7. **Medium — the Zen Browser link is broken.** In
   `content/writing/my-coding-setup.md`, the destination `zen-browser.app` lacks a
   URL scheme. It renders as `https://smitp.cc/writing/my-coding-setup/zen-browser.app`,
   a nonexistent local page. Verify the intended external URL and use its full
   HTTPS address. The Zola internal-link check does not catch this case.

8. **Low — unused and stray output assets.** Search-index generation emits about
   147 KB of index JavaScript plus an 18 KB search library, but no search UI uses
   them. These are output overhead, not automatic page-download overhead.
   `static/d` is a one-byte file copied to `/d`. The local build also copies a
   `.DS_Store` from `static/`; this is ignored locally and does not establish that
   CI publishes it. Instrument Serif is declared and shipped but no CSS rule
   currently selects it. Confirm intent before cleanup.

9. **Low — validation runs only as part of deployment.** The workflow builds on
   `main` or manual dispatch, with no pull-request validation or explicit link
   check. A PR job running the pinned Zola build and internal-link check would
   catch failures before deployment. Root `CNAME` is absent from generated output;
   verify the GitHub Pages custom-domain setting before changing domain handling.

## Verification

- Installed Zola matches CI: **0.22.1**.
- `zola build --output-dir /tmp/smit-site-audit`: passed, generating six posts,
  homepage, archive, 404 page, RSS, sitemap, and assets.
- `zola check --skip-external-links`: passed.
- HTML-parser inspection of all nine generated HTML pages found one missing local
  destination: the Zen Browser link above. Other checked local destinations and
  referenced HTML fragment IDs resolved.
- `node --check` passed for both JavaScript files.
- Build success does not establish mobile usability, accessibility compliance,
  working clipboard behavior, or live deployment health.

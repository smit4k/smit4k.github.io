# smitp.cc

Personal homepage and writing site, built with Zola 0.22.1.

```sh
zola check --skip-external-links
zola build
zola serve
```

## Admonitions

Drop a Markdown post with the usual Zola front matter into `content/writing/`.
Use standalone fences with an optional title:

```markdown
:::info More about this topic
Write normal **Markdown**, links, lists, or code here.
:::

:::warning
This gets the default title “Warning”.
:::
```

Supported types: `info`, `note`, `tip`, `important`, `warning`, `caution`, and
`danger`. Nested blocks work too; use four colons for an outer block and close
each block with the same number of colons that opened it. Separate fences from
lists, headings, and code blocks with blank lines, as with ordinary Markdown
paragraphs. Blank lines around a simple text body are optional.

Zola's article and RSS templates apply `templates/macros/admonitions.html` to
the rendered Markdown. The result is static HTML, with no preprocessing command,
Python dependency, or browser JavaScript required. Zola still handles internal
links, shortcodes, images, and syntax highlighting. Fences in code blocks and
HTML comments remain literal. Unclosed or mismatched blocks fail the build.

Callouts use `.callout`, `.callout-TYPE`, `.callout-title`, and `.callout-body`.
Customize their light/dark colors in `static/site.css`. Existing HTML callouts
continue to work. The generated search index uses Zola's original content and
may include the fence text; it does not pass through the page templates.

Run `sh tests/admonitions.sh` for rendering regression checks (Zola and standard
shell utilities only).

#!/bin/sh
# Exercise the real Tera macro through plain Zola, without another runtime.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT HUP INT TERM
mkdir -p "$fixture/content" "$fixture/templates/macros"
cp "$repo/templates/macros/admonitions.html" "$fixture/templates/macros/"
cp "$repo/templates/rss.xml" "$fixture/templates/"
cat > "$fixture/zola.toml" <<'EOF'
base_url = "https://example.com"
title = "Rendering tests"
description = "Admonitions"
generate_feeds = true
feed_filenames = ["rss.xml"]
EOF
cat > "$fixture/templates/page.html" <<'EOF'
{% import "macros/admonitions.html" as admonitions %}
{{ admonitions::render(content=page.content) }}
EOF
cat > "$fixture/content/example.md" <<'EOF'
+++
title = "Example"
date = 2026-09-19
+++
:::info
No blank lines, like the Good Habits post.
:::
Outside again.

::::warning Custom & useful

First **bold** paragraph with an [internal link](@/other.md).

- One
- Two

:::tip Nested
Inner body.
:::

## A heading

```markdown
:::info
Literal code
:::
```

::::

:::danger

Another paragraph.

:::

:::note
Note body.
:::

:::important
Important body.
:::

:::caution
Caution body.
:::

    :::warning
    Indented code
    :::

<!--
:::danger
Comment
-->

<pre>
:::tip
Raw code
</pre>

`:::warning` is inline code.

<aside class="callout callout-info"><p>Existing HTML.</p></aside>
EOF
cat > "$fixture/content/other.md" <<'EOF'
+++
title = "Other"
+++
Other page.
EOF
zola --root "$fixture" build
rendered="$fixture/public/example/index.html"
for kind in info warning tip danger note important caution; do
    grep -q "class=\"callout callout-$kind\"" "$rendered"
done
test "$(grep -o '<aside ' "$rendered" | wc -l | tr -d ' ')" = 8
test "$(grep -o '</aside>' "$rendered" | wc -l | tr -d ' ')" = 8
grep -q '<p>Outside again.</p>' "$rendered"
grep -q '<strong>bold</strong>' "$rendered"
grep -q 'href="https://example.com/other/"' "$rendered"
grep -q '<h2 id="a-heading">' "$rendered"
grep -q '<ul>' "$rendered"
grep -q ':::info' "$rendered"
grep -q 'Custom &amp; useful' "$rendered"
grep -q '&lt;aside class=&quot;callout callout-info&quot;' "$fixture/public/rss.xml"
if grep -Fq '\n' "$rendered"; then
    echo 'Unexpected literal newline escape in rendered HTML' >&2
    exit 1
fi
cat >> "$fixture/content/example.md" <<'EOF'

:::warning
Unclosed
EOF
if zola --root "$fixture" build > "$fixture/error.log" 2>&1; then
    echo 'Unclosed admonition unexpectedly succeeded' >&2
    exit 1
fi
grep -q 'Unclosed admonition' "$fixture/error.log"
printf '\n::::\n' >> "$fixture/content/example.md"
if zola --root "$fixture" build > "$fixture/error.log" 2>&1; then
    echo 'Mismatched admonition unexpectedly succeeded' >&2
    exit 1
fi
grep -q 'closing fence must match' "$fixture/error.log"
echo 'Admonition rendering checks passed.'

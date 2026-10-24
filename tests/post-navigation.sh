#!/bin/sh
# Check the real article template at both ends and in the middle of a section.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT HUP INT TERM
mkdir -p "$fixture/content/writing" "$fixture/templates"
cp -R "$repo/templates/macros" "$fixture/templates/"
cp "$repo/templates/writing-page.html" "$repo/templates/writing.html" "$fixture/templates/"
cp "$repo/content/writing/_index.md" "$fixture/content/writing/"
printf 'base_url = "https://example.com"\n' > "$fixture/zola.toml"
printf '{%% block content %%}{%% endblock content %%}\n' > "$fixture/templates/base.html"
for day in 1 2 3; do
    cat > "$fixture/content/writing/post-$day.md" <<EOF
+++
title = "Post $day"
date = 2026-01-0$day
+++
Post $day.
EOF
done
zola --root "$fixture" build
oldest="$fixture/public/writing/post-1/index.html"
middle="$fixture/public/writing/post-2/index.html"
newest="$fixture/public/writing/post-3/index.html"
grep -q 'aria-label="No older post"' "$oldest"
grep -q 'href="https://example.com/writing/post-2/" rel="next"' "$oldest"
grep -q 'href="https://example.com/writing/post-1/" rel="prev"' "$middle"
grep -q 'href="https://example.com/writing/post-3/" rel="next"' "$middle"
grep -q 'aria-label="Older post: Post 1"' "$middle"
grep -q 'aria-label="Newer post: Post 3"' "$middle"
grep -q 'href="https://example.com/writing/post-2/" rel="prev"' "$newest"
grep -q 'aria-label="No newer post"' "$newest"
test "$(grep -c 'rel="prev"\|rel="next"' "$oldest")" = 1
test "$(grep -c 'rel="prev"\|rel="next"' "$middle")" = 2
test "$(grep -c 'rel="prev"\|rel="next"' "$newest")" = 1
echo 'Post navigation checks passed.'

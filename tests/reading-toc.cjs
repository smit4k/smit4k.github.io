// Run with: node tests/reading-toc.cjs
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

const repo = join(__dirname, "..");
const script = readFileSync(join(repo, "static/reading-toc.js"), "utf8");
const links = ["first", "nested", "caf%C3%A9"].map((id, index) => ({
    hash: `#${id}`,
    offsetTop: [4, 34, 94][index],
    offsetHeight: [30, 60, 30][index],
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    getBoundingClientRect() { return { top: this.offsetTop, bottom: this.offsetTop + this.offsetHeight, height: this.offsetHeight }; },
}));
let tops = [300, 700, 1300];
let bounds = { top: 300, bottom: 2300, height: 2000 };
let progress;
let visible = true;
let resized;
const frames = [];
const events = {};
const track = { getBoundingClientRect: () => ({ top: 4, height: 120 }) };
let endSpace;
const toc = {
    hidden: false,
    style: { setProperty(name, value) { progress = value; } },
    querySelectorAll: () => links,
    querySelector: () => track,
    getClientRects() { return visible && !this.hidden ? [{}] : []; },
    getBoundingClientRect: () => ({ top: 0, bottom: 300 }),
};
const content = {
    getBoundingClientRect: () => bounds,
    after(element) { endSpace = element; },
};
const windowMock = {
    innerHeight: 600,
    scrollY: 0,
    location: { hash: "" },
    addEventListener(name, handler) { events[name] = handler; },
};
const documentMock = {
    body: {},
    querySelector: (selector) => selector === ".reading-toc" ? toc : content,
    createElement: () => ({ style: {}, setAttribute() {} }),
    getElementById: (id) => headings.find((heading) => heading.id === id),
};
const headings = ["first", "nested", "café"].map((id, index) => ({
    id,
    getBoundingClientRect: () => ({ top: tops[index] }),
    scrollIntoView() { this.scrolled = true; },
}));
const browserMocks = {
    document: documentMock,
    window: windowMock,
    getComputedStyle: () => ({ scrollMarginTop: `${Math.min(windowMock.innerHeight * 0.25, 160)}px`, paddingBottom: "48px" }),
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    ResizeObserver: class { constructor(callback) { resized = callback; } observe(element) { assert.equal(element, content); } },
};
runInNewContext(script, { ...browserMocks });
frames.shift()();
assert.equal(progress, 0);
assert.equal(links[0]["aria-current"], "location");
assert.equal(endSpace.style.height, "402px", "The last paragraph can reach the reading point");
tops = [-400, 0, 600];
events.scroll();
events.scroll();
assert.equal(frames.length, 1, "Scroll updates share one animation frame");
frames.shift()();
assert.equal(links[0]["aria-current"], undefined);
assert.equal(links[1]["aria-current"], "location");
assert.equal(progress, 0.375, "Progress uses the active row's actual height, including wrapped titles");

function scrollToPositions(positions, bottom = 800) {
    tops = positions;
    bounds = { bottom };
    events.scroll();
    frames.shift()();
}
// Reproduce clicking the penultimate heading, then scrolling a little in both directions.
for (const top of [150.2, 130.2, 140.2, 110.2]) {
    scrollToPositions([-800, top, top + 350]);
    assert.equal(links[1]["aria-current"], "location", "Small scrolls must not advance to the final heading");
    assert.ok(progress >= 0.25 && progress < 0.75, "The fill stays alongside the active row");
}
resized();
frames.shift()();
assert.equal(links[1]["aria-current"], "location");
scrollToPositions([-800, 50, 650]);
const shortSectionAdvance = progress - 0.25;
scrollToPositions([-800, 50, 1250]);
assert.ok(Math.abs(progress - 0.25 - shortSectionAdvance / 2) < 1e-10,
    "A section twice as long advances the bar half as far for the same scroll");
scrollToPositions([-800, -300, 150.2], 350);
assert.equal(links[2]["aria-current"], "location", "The final heading has its own reachable destination");
scrollToPositions([-800, -400, 50], 250);
assert.equal(progress, 0.875, "The final paragraph advances within the final ToC row");
scrollToPositions([-800, -500, -50], 150);
assert.equal(progress, 1, "Finish when the end of the article reaches the reading point");
windowMock.location.hash = "#caf%C3%A9";
events.load();
assert.equal(headings[2].scrolled, true, "Initial deep links align after the scroll space is measured");
visible = false;
events.resize();
frames.shift()();
assert.equal(endSpace.style.height, "0px", "Hidden ToCs do not add empty space on narrow screens");
visible = true;
windowMock.innerHeight = 1000;
events.resize();
frames.shift()();
assert.equal(endSpace.style.height, "792px");
links.splice(1);
runInNewContext(script, { ...browserMocks });
frames.shift()();
assert.equal(toc.hidden, true, "Hide the enhanced ToC with fewer than two headings");
runInNewContext(script, { document: { querySelector: () => null } });

const fixture = mkdtempSync(join(tmpdir(), "smit-reading-toc-"));
try {
    for (const path of ["templates", "static", "content", "syntax-themes", "zola.toml"]) {
        cpSync(join(repo, path), join(fixture, path), { recursive: true });
    }
    writeFileSync(join(fixture, "content/writing/toc-fixture.md"), `+++
title = "ToC fixture"
date = 2026-10-24
+++
# Article heading
## First & second
### Nested
#### Details
##### Excluded
## Café
## Café
`);
    execFileSync("zola", ["--root", fixture, "build"], { stdio: "pipe" });
    const html = readFileSync(join(fixture, "public/writing/toc-fixture/index.html"), "utf8");
    const nav = html.match(/<nav class="reading-toc"[\s\S]*?<\/nav>/)[0];
    assert.equal((nav.match(/class="reading-toc__link"/g) || []).length, 5);
    assert.match(nav, /First &amp; second/);
    assert.match(nav, /reading-toc__level-3/);
    assert.match(nav, /reading-toc__level-4/);
    for (const [, id] of nav.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`));
    assert.match(html, /reading-toc\.js\?/);
    assert.doesNotMatch(readFileSync(join(fixture, "public/index.html"), "utf8"), /reading-toc/);
    assert.doesNotMatch(readFileSync(join(fixture, "public/rss.xml"), "utf8"), /reading-toc/);
} finally {
    rmSync(fixture, { recursive: true, force: true });
}
console.log("Reading ToC checks passed.");

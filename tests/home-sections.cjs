// Run with: node tests/home-sections.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const elements = Object.fromEntries(
    ["writing-tab", "music-tab", "writing-links", "music-links", "writing", "music"].map((name) => [
        `#home-${name}`,
        {
            hidden: true,
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, callback) { this[name] = callback; },
        },
    ]),
);
const classes = new Set();
elements["#home-writing"].parentElement = {
    classList: {
        add(name) { classes.add(name); },
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
    },
};
const script = readFileSync(`${__dirname}/../static/home-sections.js`, "utf8");
runInNewContext(script, { document: { querySelector: (selector) => elements[selector] } });
const writingTab = elements["#home-writing-tab"];
const musicTab = elements["#home-music-tab"];
const writing = elements["#home-writing"];
const music = elements["#home-music"];
assert.equal(writingTab.disabled, false);
assert.equal(musicTab.hidden, false);
assert.equal(music.hidden, false);
assert.equal(music.inert, true);
assert.equal(music["aria-hidden"], "true");
assert.ok(classes.has("home-panels-ready"));
for (const showMusic of [true, true, false, false, true, false]) {
    (showMusic ? musicTab : writingTab).click();
    assert.equal(classes.has("show-music"), showMusic);
    assert.equal(writingTab["aria-pressed"], String(!showMusic));
    assert.equal(musicTab["aria-pressed"], String(showMusic));
    assert.equal(writing.inert, showMusic);
    assert.equal(music.inert, !showMusic);
    assert.equal(writing["aria-hidden"], String(showMusic));
    assert.equal(music["aria-hidden"], String(!showMusic));
    assert.equal(elements["#home-writing-links"].hidden, showMusic);
    assert.equal(elements["#home-music-links"].hidden, !showMusic);
}
runInNewContext(script, { document: { querySelector: () => null } });
console.log("Homepage section checks passed.");

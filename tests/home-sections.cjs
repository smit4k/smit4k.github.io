// Run with: node tests/home-sections.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const elements = Object.fromEntries(
    ["writing-tab", "now-tab", "writing-links", "writing", "now", "now-help"].map((name) => [
        `#home-${name}`,
        {
            hidden: name === "now-tab",
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
const document = {
    querySelector: (selector) => elements[selector],
    addEventListener(name, callback) { this[name] = callback; },
};
runInNewContext(script, { document });
const writingTab = elements["#home-writing-tab"];
const nowTab = elements["#home-now-tab"];
const writing = elements["#home-writing"];
const now = elements["#home-now"];
assert.equal(writingTab.disabled, false);
assert.equal(nowTab.hidden, false);
assert.equal(now.hidden, false);
assert.equal(now.inert, true);
assert.equal(now["aria-hidden"], "true");
assert.ok(classes.has("home-panels-ready"));
for (const showNow of [true, true, false, false, true, false]) {
    (showNow ? nowTab : writingTab).click();
    assert.equal(classes.has("show-now"), showNow);
    assert.equal(writingTab["aria-pressed"], String(!showNow));
    assert.equal(nowTab["aria-pressed"], String(showNow));
    assert.equal(writing.inert, showNow);
    assert.equal(now.inert, !showNow);
    assert.equal(writing["aria-hidden"], String(showNow));
    assert.equal(now["aria-hidden"], String(!showNow));
    assert.equal(elements["#home-writing-links"].hidden, showNow);
}
const nowHelp = elements["#home-now-help"];
nowHelp.classList = new Set();
nowHelp.classList.remove = nowHelp.classList.delete;
document.keydown({ key: "Enter" });
assert.equal(nowHelp.classList.has("dismissed"), false);
document.keydown({ key: "Escape" });
assert.equal(nowHelp.classList.has("dismissed"), true);
nowHelp.mouseenter();
assert.equal(nowHelp.classList.has("dismissed"), false);
document.keydown({ key: "Escape" });
nowHelp.focusin();
assert.equal(nowHelp.classList.has("dismissed"), false);
runInNewContext(script, { document: { querySelector: () => null } });
console.log("Homepage section checks passed.");

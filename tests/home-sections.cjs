// Run with: node tests/home-sections.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const sections = ["writing", "projects", "now"];
const elements = Object.fromEntries(
    ["writing-links", "now-help", ...sections].map((name) => [
        `#home-${name}`,
        {
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, callback) { this[name] = callback; },
        },
    ]),
);
const tabs = sections.map((section) => ({
    id: `home-${section}-tab`,
    getAttribute(name) {
        assert.equal(name, "aria-controls");
        return `home-${section}`;
    },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, callback) { this[name] = callback; },
}));
const classes = new Set();
elements[".home-panels"] = { classList: classes };
const script = readFileSync(`${__dirname}/../static/home-sections.js`, "utf8");
const document = {
    querySelector: (selector) => elements[selector],
    querySelectorAll: (selector) => {
        assert.equal(selector, ".home-section-title button");
        return tabs;
    },
    getElementById: (id) => elements[`#${id}`],
    addEventListener(name, callback) { this[name] = callback; },
};
runInNewContext(script, { document });
for (const tab of tabs) {
    assert.equal(tab.disabled, false);
    assert.equal(tab.hidden, false);
}
assert.ok(classes.has("home-panels-ready"));

function assertSelected(selectedSection) {
    for (const [index, section] of sections.entries()) {
        const selected = section === selectedSection;
        const panel = elements[`#home-${section}`];
        assert.equal(tabs[index]["aria-pressed"], String(selected));
        assert.equal(panel.inert, !selected);
        assert.equal(panel["aria-hidden"], String(!selected));
    }
    assert.equal(elements["#home-writing-links"].hidden, selectedSection !== "writing");
}

assertSelected("writing");
for (const section of ["now", "projects", "projects", "writing", "projects", "now", "writing"]) {
    tabs[sections.indexOf(section)].click();
    assertSelected(section);
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
runInNewContext(script, { document: { querySelectorAll: () => [] } });
console.log("Homepage section checks passed.");

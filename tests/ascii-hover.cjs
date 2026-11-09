// Run with: node tests/ascii-hover.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const script = readFileSync(`${__dirname}/../static/ascii-hover.js`, "utf8");

function setup(reduced = false) {
    const art = {
        textContent: "X X\n XX",
        events: {},
        addEventListener(name, callback) { this.events[name] = callback; },
        getBoundingClientRect: () => ({ left: 100, top: 200, width: 100, height: 20 }),
    };
    const motion = {
        matches: reduced,
        addEventListener(name, callback) { this[name] = callback; },
    };
    runInNewContext(script, {
        document: {
            querySelector: () => art,
            createRange: () => ({
                selectNodeContents(element) { assert.equal(element, art); },
                getBoundingClientRect: () => ({ width: 30 }),
            }),
        },
        matchMedia: () => motion,
    });
    return { art, motion };
}

const { art, motion } = setup();
const original = art.textContent;
assert.equal(art.textContent, original, "The flower starts intact");
art.events.mouseenter({ clientX: 105, clientY: 205 });
assert.equal(art.textContent[0], "@", "The effect follows the rendered glyph position");
assert.notEqual(art.textContent, original);
assert.equal(art.textContent.replace(/\S/g, "X"), original, "Whitespace and line lengths stay intact");
art.events.mousemove({ clientX: 1000, clientY: 1000 });
assert.equal(art.textContent, original, "Characters outside the radius remain unchanged");
art.events.mousemove({ clientX: 105, clientY: 205 });
art.events.mouseleave();
assert.equal(art.textContent, original, "Leaving restores the exact flower");
art.events.mouseenter({ clientX: 105, clientY: 205 });
motion.matches = true;
motion.change();
assert.equal(art.textContent, original, "Changing to reduced motion clears the distortion");
art.events.mousemove({ clientX: 105, clientY: 205 });
assert.equal(art.textContent, original);
const reduced = setup(true);
reduced.art.events.mouseenter({ clientX: 105, clientY: 205 });
assert.equal(reduced.art.textContent, original, "Reduced motion disables hover distortion");
runInNewContext(script, { document: { querySelector: () => null } });
console.log("ASCII hover checks passed.");

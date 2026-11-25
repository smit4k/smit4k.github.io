// Run with: node tests/ascii-hover.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const script = readFileSync(`${__dirname}/../static/ascii-hover.js`, "utf8");

function setup(reduced = false, text = ["⡁⠀", "⡇\n ⣿", "⣿"]) {
    const spans = text.map((data, index) => ({
        className: index === 0 ? "ascii-blossom" : "",
        node: { data },
    }));
    const art = {
        childNodes: spans,
        get textContent() { return this.childNodes.map((span) => span.node.data).join(""); },
        set textContent(value) { this.childNodes = [{ node: { data: value } }]; },
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
            createTreeWalker: () => ({
                index: 0,
                nextNode() {
                    this.currentNode = spans[this.index++]?.node;
                    return this.currentNode ?? null;
                },
            }),
            createRange: () => ({
                selectNodeContents(element) { assert.equal(element, art); },
                getBoundingClientRect: () => ({ width: 30 }),
            }),
        },
        NodeFilter: { SHOW_TEXT: 4 },
        matchMedia: () => motion,
    });
    return { art, motion, spans };
}

const { art, motion, spans } = setup();
const original = art.textContent;
assert.equal(art.textContent, original, "The tree starts intact");
art.events.mouseenter({ clientX: 105, clientY: 205 });
assert.equal(art.textContent[0], "⣿", "The effect follows the rendered glyph position");
assert.notEqual(art.textContent, original);
assert.deepEqual(art.textContent.match(/[\s\u2800]/g), original.match(/[\s\u2800]/g), "Blank cells stay intact");
assert.deepEqual(art.textContent.split("\n").map((line) => line.length), [3, 3]);
assert.equal(art.childNodes, spans, "Hover preserves the colored spans");
assert.equal(spans[0].className, "ascii-blossom");
assert.equal(spans[1].className, "");
art.events.mousemove({ clientX: 1000, clientY: 1000 });
assert.equal(art.textContent, original, "Characters outside the radius remain unchanged");
art.events.mousemove({ clientX: 105, clientY: 205 });
art.events.mouseleave();
assert.equal(art.textContent, original, "Leaving restores the exact tree");
assert.equal(art.childNodes, spans, "Restoring preserves the colored spans");
art.events.mouseenter({ clientX: 105, clientY: 205 });
motion.matches = true;
motion.change();
assert.equal(art.textContent, original, "Changing to reduced motion clears the distortion");
art.events.mousemove({ clientX: 105, clientY: 205 });
assert.equal(art.textContent, original);
const reduced = setup(true);
reduced.art.events.mouseenter({ clientX: 105, clientY: 205 });
assert.equal(reduced.art.textContent, original, "Reduced motion disables hover distortion");
const flower = setup(false, ["# ", "@\n @", "#"]);
const originalFlower = flower.art.textContent;
flower.art.events.mouseenter({ clientX: 105, clientY: 205 });
assert.equal(flower.art.textContent[0], "@", "The flower uses ASCII hover shades");
assert.match(flower.art.textContent, /^[\x20-\x7e\n]+$/, "The flower stays ASCII during hover");
assert.deepEqual(flower.art.textContent.match(/\s/g), originalFlower.match(/\s/g));
flower.art.events.mouseleave();
assert.equal(flower.art.textContent, originalFlower, "Leaving restores the exact flower");
runInNewContext(script, { document: { querySelector: () => null } });
console.log("ASCII hover checks passed.");

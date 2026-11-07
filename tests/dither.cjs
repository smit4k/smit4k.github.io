// Run with: node tests/dither.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const script = readFileSync(`${__dirname}/../static/dither.js`, "utf8");

function setup({ webgl = true, compiled = true, linked = true, reduced = false } = {}) {
    const target = (properties = {}) => ({
        events: {},
        addEventListener(name, handler) { this.events[name] = handler; },
        ...properties,
    });
    const frames = new Map();
    const uniforms = {};
    let draws = 0;
    let deleted = 0;
    let now = 100;
    let nextFrame = 0;
    let resize;
    let intersect;
    let disconnected = 0;
    const gl = new Proxy({
        VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, TRIANGLES: 5,
        createProgram: () => ({}), createShader: () => ({}),
        getShaderParameter: () => compiled, getProgramParameter: () => linked,
        getUniformLocation: (_, name) => name,
        uniform1f(name, value) { uniforms[name] = value; },
        uniform2f(name, x, y) { uniforms[name] = [x, y]; },
        uniform3fv(name, value) { uniforms[name] = [...value]; },
        drawArrays() { draws++; }, deleteProgram() { deleted++; },
    }, { get: (object, key) => object[key] ?? (() => {}) });
    const canvas = target({ getContext: () => webgl ? gl : null });
    const container = target({ clientWidth: 304, clientHeight: 448, append(element) { this.canvas = element; } });
    const motion = target({ matches: reduced });
    const theme = target({ matches: false });
    const document = target({
        hidden: false,
        createElement: () => canvas,
        querySelector: (selector) => selector === ".home-dither" ? container : null,
    });
    const window = target();
    const style = { color: "rgb(126, 179, 248)", backgroundColor: "rgb(0, 0, 0)" };
    runInNewContext(script, {
        document, window, console: { warn() {} }, performance: { now: () => now },
        matchMedia: (query) => query.includes("reduced-motion") ? motion : theme,
        getComputedStyle: () => style,
        requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
        cancelAnimationFrame(id) { frames.delete(id); },
        ResizeObserver: class {
            constructor(callback) { resize = callback; }
            observe() {} disconnect() { disconnected++; }
        },
        IntersectionObserver: class {
            constructor(callback) { intersect = callback; }
            observe() {} disconnect() { disconnected++; }
        },
    });
    return {
        container, canvas, motion, theme, document, window, style, frames, uniforms,
        get draws() { return draws; }, get deleted() { return deleted; },
        get disconnected() { return disconnected; },
        resize: () => resize(), intersect: (visible) => intersect([{ isIntersecting: visible }]),
        tick() {
            const [id, callback] = frames.entries().next().value;
            frames.delete(id);
            callback(now += 16);
        },
    };
}

for (const options of [{ webgl: false }, { compiled: false }, { linked: false }]) {
    const state = setup(options);
    assert.equal(state.container.canvas, undefined, "An unavailable renderer leaves the CSS fallback visible");
    assert.equal(state.frames.size, 0);
    if (options.webgl !== false) assert.equal(state.deleted, 1);
}
runInNewContext(script, { document: { querySelector: () => null } });

const s = setup();
assert.deepEqual([s.canvas.width, s.canvas.height], [152, 224]);
assert.deepEqual(s.uniforms.resolution, [152, 224]);
assert.deepEqual(s.uniforms.waveColor, [126 / 255, 179 / 255, 248 / 255]);
assert.equal(s.frames.size, 1);
s.tick();
s.tick();
assert.ok(s.uniforms.time > 0);
const time = s.uniforms.time;
assert.deepEqual(Object.keys(s.container.events), [], "The banner has no pointer interaction");
s.style.color = "rgb(31, 111, 186)";
s.style.backgroundColor = "rgb(255, 255, 255)";
s.theme.events.change();
assert.deepEqual(s.uniforms.waveColor, [31 / 255, 111 / 255, 186 / 255]);
assert.deepEqual(s.uniforms.backgroundColor, [1, 1, 1]);
assert.equal(s.uniforms.time, time, "Theme changes repaint without advancing the animation");
assert.equal(s.frames.size, 1);
s.document.hidden = true;
s.document.events.visibilitychange();
assert.equal(s.frames.size, 0);
s.document.hidden = false;
s.document.events.visibilitychange();
assert.equal(s.uniforms.time, time, "Resuming does not jump ahead by time spent hidden");
s.intersect(false);
assert.equal(s.frames.size, 0);
s.intersect(true);
assert.equal(s.frames.size, 1);
s.container.clientWidth = 0;
s.resize();
assert.equal(s.frames.size, 0, "The mobile-hidden banner does not animate");
s.container.clientWidth = 304;
s.resize();
assert.equal(s.frames.size, 1);
s.motion.matches = true;
s.motion.events.change();
assert.equal(s.frames.size, 0);
const r = setup({ reduced: true });
assert.ok(r.draws > 0, "Reduced motion still displays the artwork");
assert.equal(r.frames.size, 0, "Reduced motion never starts an animation loop");
s.motion.matches = false;
s.motion.events.change();
s.window.events.pagehide();
assert.equal(s.frames.size, 0);
s.window.events.pageshow();
assert.equal(s.frames.size, 1);
s.canvas.events.webglcontextlost({ preventDefault() {} });
assert.equal(s.canvas.hidden, true);
assert.equal(s.frames.size, 0);
assert.equal(s.disconnected, 2);
const draws = s.draws;
s.theme.events.change();
assert.equal(s.draws, draws, "A lost context stays on the fallback");
console.log("Dither checks passed.");

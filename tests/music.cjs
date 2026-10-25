// Run with: node tests/music.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

const script = readFileSync(join(__dirname, "../static/music.js"), "utf8");
const flush = () => new Promise(setImmediate);
const track = (name, playing = false) => ({
    name,
    artist: { "#text": "An artist" },
    album: { "#text": "An album" },
    url: "https://www.last.fm/music/Artist/_/Song",
    image: [{ size: "large", "#text": "https://lastfm.freetls.fastly.net/cover.jpg" }],
    "@attr": { nowplaying: String(playing) },
});

function setup(data, key = "test-key") {
    const state = { data, calls: [], rows: [], hidden: false, focused: false };
    const list = {
        replaceChildren(...rows) { state.rows = rows; },
        contains() { return state.focused; },
    };
    const status = { textContent: "Recent listening is available on Last.fm." };
    const template = { content: { firstElementChild: { cloneNode() {
        const fields = {
            ".music-title": {}, ".music-artist": {}, ".music-album": {},
            ".music-playing": { hidden: true },
            img: { hidden: true, addEventListener(name, callback) { this[name] = callback; } },
        };
        return {
            fields,
            classList: { add(value) { fields.className = value; } },
            querySelector: (selector) => fields[selector],
        };
    } } } };
    const selectors = {
        ".music-list": list, ".music-status": status, template,
        ".music-profile": { href: "https://www.last.fm/user/smitsmusic" },
    };
    const music = { dataset: { lastfmApiKey: key, lastfmUser: "smitsmusic" },
        querySelector: (selector) => selectors[selector] };
    runInNewContext(script, {
        URL, URLSearchParams, AbortSignal,
        document: { querySelector: () => music, get hidden() { return state.hidden; } },
        window: { setInterval(callback, delay) { state.refresh = callback; assert.equal(delay, 60_000); } },
        async fetch(url, options) {
            state.calls.push(url);
            assert.ok(options.signal instanceof AbortSignal);
            if (state.data instanceof Error) throw state.data;
            return { ok: !state.httpError, json: async () => state.data };
        },
    });
    return Object.assign(state, { list, status });
}

(async () => {
    const state = setup({ recenttracks: { track: [track("Current", true), track("Previous"), track("Earlier"), track("Extra")] } });
    await flush();
    assert.equal(state.rows.length, 3, "Now playing plus exactly two completed tracks");
    assert.deepEqual(state.rows.map((row) => row.fields[".music-title"].textContent), ["Current", "Previous", "Earlier"]);
    assert.equal(state.rows[0].fields.className, "is-playing");
    assert.equal(state.rows[0].fields[".music-playing"].hidden, false);
    assert.equal(state.rows[1].fields[".music-playing"].hidden, true);
    assert.equal(state.rows[0].fields[".music-artist"].textContent, "An artist");
    assert.equal(state.rows[0].fields[".music-album"].textContent, "An album");
    const image = state.rows[0].fields.img;
    image.load();
    assert.equal(image.hidden, false);
    image.error();
    assert.equal(image.hidden, true, "Broken artwork returns to the placeholder");
    const url = state.calls[0];
    assert.equal(url.searchParams.get("user"), "smitsmusic");
    assert.equal(url.searchParams.get("limit"), "3");

    state.data = { recenttracks: { track: [track("One"), track("Two"), track("Three")] } };
    state.refresh();
    await flush();
    assert.equal(state.rows.length, 3, "Idle state shows three recent tracks");
    assert.ok(state.rows.every((row) => !row.fields.className), "Idle state has no now-playing divider");
    state.hidden = true;
    state.refresh();
    assert.equal(state.calls.length, 2, "Hidden pages do not poll");
    state.hidden = false;
    state.focused = true;
    state.refresh();
    assert.equal(state.calls.length, 2, "Polling preserves keyboard focus inside the list");
    state.focused = false;

    state.data = { recenttracks: { track: [{ name: "<img onerror=alert(1)>", url: "javascript:alert(1)", image: [{ size: "large", "#text": "javascript:alert(1)" }] }, null] } };
    state.refresh();
    await flush();
    assert.equal(state.rows[0].fields[".music-title"].textContent, "<img onerror=alert(1)>", "Track names stay plain text");
    assert.equal(state.rows[0].fields[".music-title"].href, "https://www.last.fm/user/smitsmusic");
    assert.equal(state.rows[0].fields[".music-artist"].textContent, "Unknown artist");
    assert.equal(state.rows[0].fields[".music-album"].textContent, "Unknown album");
    assert.equal(state.rows[0].fields.img.src, undefined, "Unsafe artwork URLs are ignored");

    for (const data of [new Error("Offline"), { error: 10 }, { recenttracks: { track: "invalid" } }]) {
        state.data = data;
        state.refresh();
        await flush();
        assert.equal(state.rows.length, 0, "Failures clear stale now-playing data");
        assert.equal(state.list.hidden, true);
        assert.match(state.status.textContent, /temporarily unavailable/);
    }
    state.httpError = true;
    state.refresh();
    await flush();
    assert.match(state.status.textContent, /temporarily unavailable/);
    state.httpError = false;
    state.data = { recenttracks: { track: [] } };
    state.refresh();
    await flush();
    assert.equal(state.status.textContent, "No recent listening yet.");

    const unconfigured = setup({}, "");
    assert.equal(unconfigured.calls.length, 0, "No requests without an API key");
    assert.match(unconfigured.status.textContent, /available on Last.fm/);
    runInNewContext(script, { document: { querySelector: () => null } });
    console.log("Music checks passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });

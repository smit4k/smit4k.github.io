// Run with: node tests/music.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

const script = readFileSync(join(__dirname, "../static/music.js"), "utf8");
const flush = () => new Promise(setImmediate);
const now = Date.parse("2026-10-25T04:40:00Z");
const track = (name, playing = false) => ({
    name,
    artist: { "#text": "An artist" },
    album: { "#text": "An album" },
    url: "https://www.last.fm/music/Artist/_/Song",
    image: [{ size: "large", "#text": "https://lastfm.freetls.fastly.net/cover.jpg" }],
    "@attr": { nowplaying: String(playing) },
    date: { uts: String((now - 300_000) / 1000) },
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
            ".music-time": { hidden: true },
            img: { hidden: true, addEventListener(name, callback) { this[name] = callback; } },
        };
        return {
            fields,
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
        Date: class extends Date { static now() { return now; } },
        document: { querySelector: (selector) => selector === ".music-section" ? music : selectors[selector],
            get hidden() { return state.hidden; } },
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
    assert.equal(state.rows[0].fields[".music-playing"].hidden, false);
    assert.equal(state.rows[1].fields[".music-playing"].hidden, true);
    assert.equal(state.rows[0].fields[".music-time"].hidden, true, "Now-playing tracks have no completed scrobble time");
    assert.equal(state.rows[1].fields[".music-time"].textContent, "5 min. ago");
    assert.equal(state.rows[1].fields[".music-time"].dateTime, "2026-10-25T04:35:00.000Z");
    assert.equal(state.rows[1].fields[".music-time"].hidden, false);
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
    assert.ok(state.rows.every((row) => row.fields[".music-playing"].hidden), "Idle tracks have no now-playing label");
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
    assert.equal(state.rows[0].fields[".music-time"].hidden, true, "Missing timestamps stay hidden");

    for (const [seconds, label] of [
        [0, "just now"], [59, "just now"], [60, "1 min. ago"],
        [3599, "59 min. ago"], [3600, "1 hr. ago"], [86_400, "1 day ago"],
        [604_800, "1 wk. ago"], [2_592_000, "1 mo. ago"], [31_536_000, "1 yr. ago"],
        [-60, "just now"],
    ]) {
        state.data = { recenttracks: { track: [{ ...track("Timed"), date: { uts: String(now / 1000 - seconds) } }] } };
        state.refresh();
        await flush();
        assert.equal(state.rows[0].fields[".music-time"].textContent, label);
    }
    for (const uts of ["invalid", "", "0", "Infinity", "1e99"]) {
        state.data = { recenttracks: { track: [{ ...track("Invalid date"), date: { uts } }] } };
        state.refresh();
        await flush();
        assert.equal(state.rows[0].fields[".music-time"].hidden, true, "Invalid timestamps do not break the track list");
    }

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

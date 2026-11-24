import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const site = new URL('../public/skyshot/', import.meta.url);
const html = await readFile(new URL('index.html', site), 'utf8');
assert.match(html, /<h1>Skyshot<\/h1>/);
assert.match(html, /href="\.\/style\.css"/);
assert.match(html, /src="\.\/app\.mjs"/);

const { fontNames } = await import(new URL('skyshot/shared.mjs', site));
for (const path of [
    'style.css', 'app.mjs', 'render-worker.mjs', 'skyshot/web.mjs',
    'skyshot/shared.mjs', 'skyshot/media-fetch.mjs', 'skyshot/generated/skyshot.js',
    'skyshot/LICENSE-Bluesky-icons', 'skyshot/fonts/OFL-Inter.txt',
    ...fontNames.map(name => `skyshot/fonts/${name}`),
]) {
    assert.ok((await readFile(new URL(path, site))).length > 0, path);
}
await WebAssembly.compile(await readFile(new URL('skyshot/generated/skyshot_bg.wasm', site)));
console.log('Skyshot subdirectory checks passed.');

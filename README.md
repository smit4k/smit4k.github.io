# smitp.cc
My current homepage.
[![](homepage_light.png)](https://smitp.cc/)

The homepage switches between Writing and Now using the section heading buttons.
Update the Now bullets in `templates/index.html` to share current priorities.
Without JavaScript, both sections remain visible.

Run the section-switching regression checks with `node tests/home-sections.cjs`.

Skyshot is served at `https://smitp.cc/skyshot/`. The Pages workflow builds
`smit4k/skyshot` at the commit pinned in `.github/workflows/deploy.yml` and copies
its static output into `public/skyshot/` after Zola builds the main site. Update
that workflow's Skyshot `ref` to deploy a newer version.

To include Skyshot in a local preview, use the sibling `../skyshot` checkout with
its WebAssembly package built (see its README for prerequisites):

```sh
npm --prefix ../skyshot run build
zola build
cp -R ../skyshot/dist public/skyshot
node tests/skyshot.mjs
python3 -m http.server 4321 --directory public --bind 127.0.0.1
```

Open `http://127.0.0.1:4321/skyshot/`. Rebuild and copy Skyshot again after any
Zola build, which replaces `public/`.

# smitp.cc
My current homepage.
[![](homepage_light.png)](https://smitp.cc/)

The homepage switches between Writing and Now using the section heading buttons.
Update the Now bullets in `templates/index.html` to share current priorities.
Without JavaScript, both sections remain visible.

Run the section-switching regression checks with `node tests/home-sections.cjs`.

Skyshot is served at `https://smitp.cc/skyshot/`. The Pages workflow builds
`smit4k/skyshot` at the commit pinned in `.github/workflows/deploy.yml` and copies
its output into `static/skyshot/` before Zola builds the main site. Update
that workflow's Skyshot `ref` to deploy a newer version.

To include Skyshot in a local preview, use the sibling `../skyshot` checkout with
its WebAssembly package built (see its README for prerequisites):

```sh
npm --prefix ../skyshot run build
mkdir -p static/skyshot
cp -R ../skyshot/dist/. static/skyshot/
zola serve
```

Open `http://127.0.0.1:1111/skyshot/`. The generated `static/skyshot/` directory is
ignored by version control and included in every Zola build or preview. Rebuild
and copy Skyshot again when its source changes. Run `zola build` followed by
`node tests/skyshot.mjs` to check the complete output.

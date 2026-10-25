const music = document.querySelector(".music-section");

function httpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : null;
    } catch {
        return null;
    }
}

if (music?.dataset.lastfmApiKey) {
    const list = music.querySelector(".music-list");
    const status = music.querySelector(".music-status");
    const template = music.querySelector("template");
    const profile = document.querySelector(".music-profile").href;
    const endpoint = new URL("https://ws.audioscrobbler.com/2.0/");
    endpoint.search = new URLSearchParams({
        method: "user.getrecenttracks",
        user: music.dataset.lastfmUser,
        api_key: music.dataset.lastfmApiKey,
        format: "json",
        limit: "3",
    });

    function trackRow(track, playing) {
        const row = template.content.firstElementChild.cloneNode(true);
        const title = row.querySelector(".music-title");
        title.textContent = track.name;
        title.href = httpsUrl(track.url) || profile;
        row.querySelector(".music-artist").textContent = track.artist?.["#text"] || "Unknown artist";
        row.querySelector(".music-album").textContent = track.album?.["#text"] || "Unknown album";

        if (playing) {
            row.classList.add("is-playing");
            row.querySelector(".music-playing").hidden = false;
        }

        const artwork = Array.isArray(track.image)
            ? track.image.find((image) => image.size === "large")?.["#text"]
            : null;
        const imageUrl = httpsUrl(artwork);
        if (imageUrl) {
            const image = row.querySelector("img");
            image.addEventListener("load", () => { image.hidden = false; });
            image.addEventListener("error", () => { image.hidden = true; });
            image.src = imageUrl;
        }
        return row;
    }

    async function updateTracks() {
        try {
            const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error("Last.fm request failed");
            const data = await response.json();
            if (!Array.isArray(data.recenttracks?.track)) throw new Error("Invalid Last.fm response");

            const tracks = data.recenttracks.track.filter((track) => typeof track?.name === "string" && track.name);
            const playing = tracks.find((track) => track["@attr"]?.nowplaying === "true");
            const recent = tracks.filter((track) => track["@attr"]?.nowplaying !== "true")
                .slice(0, playing ? 2 : 3);
            const rows = playing ? [trackRow(playing, true)] : [];
            rows.push(...recent.map((track) => trackRow(track, false)));
            list.replaceChildren(...rows);
            list.hidden = rows.length === 0;
            status.textContent = rows.length ? "" : "No recent listening yet.";
        } catch {
            list.replaceChildren();
            list.hidden = true;
            status.textContent = "Listening history is temporarily unavailable.";
        }
    }

    status.textContent = "Loading recent listening…";
    updateTracks();
    window.setInterval(() => {
        if (!document.hidden && !list.contains(document.activeElement)) updateTracks();
    }, 60_000);
}

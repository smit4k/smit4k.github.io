const writingTab = document.querySelector("#home-writing-tab");

if (writingTab) {
    const musicTab = document.querySelector("#home-music-tab");
    const links = document.querySelector("#home-writing-links");
    const musicLinks = document.querySelector("#home-music-links");
    const writing = document.querySelector("#home-writing");
    const music = document.querySelector("#home-music");
    const panels = writing.parentElement;

    music.hidden = false;
    music.inert = true;
    music.setAttribute("aria-hidden", "true");
    panels.classList.add("home-panels-ready");
    writingTab.disabled = false;
    musicTab.hidden = false;

    function selectSection(showMusic) {
        panels.classList.toggle("show-music", showMusic);
        writingTab.setAttribute("aria-pressed", String(!showMusic));
        musicTab.setAttribute("aria-pressed", String(showMusic));
        links.hidden = showMusic;
        musicLinks.hidden = !showMusic;
        writing.inert = showMusic;
        music.inert = !showMusic;
        writing.setAttribute("aria-hidden", String(showMusic));
        music.setAttribute("aria-hidden", String(!showMusic));
    }

    writingTab.addEventListener("click", () => selectSection(false));
    musicTab.addEventListener("click", () => selectSection(true));
}

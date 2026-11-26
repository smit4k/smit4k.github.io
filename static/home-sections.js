const writingTab = document.querySelector("#home-writing-tab");

if (writingTab) {
    const nowTab = document.querySelector("#home-now-tab");
    const links = document.querySelector("#home-writing-links");
    const writing = document.querySelector("#home-writing");
    const now = document.querySelector("#home-now");
    const panels = writing.parentElement;

    now.inert = true;
    now.setAttribute("aria-hidden", "true");
    panels.classList.add("home-panels-ready");
    writingTab.disabled = false;
    nowTab.hidden = false;

    function selectSection(showNow) {
        panels.classList.toggle("show-now", showNow);
        writingTab.setAttribute("aria-pressed", String(!showNow));
        nowTab.setAttribute("aria-pressed", String(showNow));
        links.hidden = showNow;
        writing.inert = showNow;
        now.inert = !showNow;
        writing.setAttribute("aria-hidden", String(showNow));
        now.setAttribute("aria-hidden", String(!showNow));
    }

    writingTab.addEventListener("click", () => selectSection(false));
    nowTab.addEventListener("click", () => selectSection(true));

    const nowHelp = document.querySelector("#home-now-help");
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") nowHelp.classList.add("dismissed");
    });
    nowHelp.addEventListener("mouseenter", () => nowHelp.classList.remove("dismissed"));
    nowHelp.addEventListener("focusin", () => nowHelp.classList.remove("dismissed"));
}

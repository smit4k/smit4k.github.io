const tabs = document.querySelectorAll(".home-section-title button");

if (tabs.length) {
    const links = document.querySelector("#home-writing-links");
    const panels = document.querySelector(".home-panels");

    function selectSection(selectedTab) {
        for (const tab of tabs) {
            const panel = document.getElementById(tab.getAttribute("aria-controls"));
            const selected = tab === selectedTab;
            tab.setAttribute("aria-pressed", String(selected));
            panel.inert = !selected;
            panel.setAttribute("aria-hidden", String(!selected));
        }
        links.hidden = selectedTab.id !== "home-writing-tab";
    }

    selectSection(tabs[0]);
    panels.classList.add("home-panels-ready");

    for (const tab of tabs) {
        tab.hidden = false;
        tab.disabled = false;
        tab.addEventListener("click", () => selectSection(tab));
    }

    const nowHelp = document.querySelector("#home-now-help");
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") nowHelp.classList.add("dismissed");
    });
    nowHelp.addEventListener("mouseenter", () => nowHelp.classList.remove("dismissed"));
    nowHelp.addEventListener("focusin", () => nowHelp.classList.remove("dismissed"));
}

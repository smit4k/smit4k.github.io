const toc = document.querySelector(".reading-toc");
const content = document.querySelector(".post-content");

if (toc && content) {
    const links = Array.from(toc.querySelectorAll(".reading-toc__link"));
    const headings = links.map((link) =>
        document.getElementById(decodeURIComponent(link.hash.slice(1))),
    );
    const track = toc.querySelector(".reading-toc__progress-track");
    const endSpace = document.createElement("div");
    endSpace.className = "reading-toc-end-space";
    endSpace.setAttribute("aria-hidden", "true");
    content.after(endSpace);
    let frame = 0;
    let activeLink;
    let readingLine = 0;

    toc.hidden = links.length < 2;

    function update() {
        frame = 0;
        if (!toc.getClientRects().length) return;

        const positions = headings.map((heading) => heading.getBoundingClientRect().top);
        let activeIndex = 0;
        positions.forEach((top, index) => {
            if (top <= readingLine + 1) activeIndex = index;
        });
        const start = positions[activeIndex];
        const end = positions[activeIndex + 1] ?? content.getBoundingClientRect().bottom;
        const sectionProgress = Math.min(1, Math.max(0, (readingLine - start) / Math.max(1, end - start)));
        const nextLink = links[activeIndex];
        const linkBounds = nextLink.getBoundingClientRect();
        const trackBounds = track.getBoundingClientRect();
        const filledHeight = linkBounds.top - trackBounds.top + sectionProgress * linkBounds.height;
        toc.style.setProperty("--reading-progress", Math.min(1, Math.max(0, filledHeight / trackBounds.height)));
        if (nextLink !== activeLink) {
            activeLink?.removeAttribute("aria-current");
            nextLink.setAttribute("aria-current", "location");
            activeLink = nextLink;
            // Keep the current section visible inside a long, scrollable ToC.
            const listBounds = toc.getBoundingClientRect();
            if (linkBounds.top < listBounds.top) toc.scrollTop -= listBounds.top - linkBounds.top;
            if (linkBounds.bottom > listBounds.bottom) toc.scrollTop += linkBounds.bottom - listBounds.bottom;
        }
    }

    function requestUpdate() {
        if (!frame) frame = requestAnimationFrame(update);
    }

    function measure() {
        readingLine = parseFloat(getComputedStyle(headings[0]).scrollMarginTop);
        const bottomPadding = parseFloat(getComputedStyle(document.body).paddingBottom);
        // Let the final paragraph reach the same reading point as every other section.
        endSpace.style.height = toc.getClientRects().length
            ? `${Math.max(0, window.innerHeight - readingLine - bottomPadding)}px`
            : "0px";
        requestUpdate();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", () => {
        const heading = headings.find((heading) => `#${encodeURIComponent(heading.id)}` === window.location.hash);
        heading?.scrollIntoView();
    });
    new ResizeObserver(measure).observe(content);
    measure();
}

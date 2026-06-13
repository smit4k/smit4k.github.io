const contentSelector = ".post-content";
const headingSelector = "h2, h3, h4";
const minHeadings = 2;
const hideBelow = 900;

const contentElement = document.querySelector(contentSelector);
let frame = 0;
let activeId = "";
let headings = [];
let headingElements = [];
let toc;
let progressFill;
let list;

if (contentElement) {
    installReadingToc(contentElement);
}

function installReadingToc(content) {
    toc = document.createElement("aside");
    toc.className = "reading-toc";
    toc.setAttribute("aria-label", "Table of contents");

    const progressTrack = document.createElement("div");
    progressTrack.className = "reading-toc__progress-track";
    progressTrack.setAttribute("aria-hidden", "true");

    progressFill = document.createElement("div");
    progressFill.className = "reading-toc__progress-fill";
    progressTrack.append(progressFill);

    list = document.createElement("nav");
    list.className = "reading-toc__list";

    toc.append(progressTrack, list);
    content.before(toc);

    const observer = new MutationObserver(() => {
        collectHeadings();
        render();
        requestUpdate();
    });

    collectHeadings();
    render();
    observer.observe(content, { childList: true, subtree: true });

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();
}

function collectHeadings() {
    const usedIds = new Set();
    const discoveredHeadings = Array.from(
        contentElement.querySelectorAll(headingSelector),
    );

    headings = discoveredHeadings
        .map((heading, index) => {
            const id = ensureUniqueId(heading, index, usedIds);
            const text = getHeadingText(heading);

            if (!id || !text) {
                return null;
            }

            return {
                id,
                text,
                level: Number(heading.tagName.slice(1)),
            };
        })
        .filter(Boolean);

    headingElements = headings
        .map((heading) => document.getElementById(heading.id))
        .filter(Boolean);
}

function ensureUniqueId(heading, index, usedIds) {
    if (heading.id && !usedIds.has(heading.id)) {
        usedIds.add(heading.id);
        return heading.id;
    }

    const baseId = slugify(getHeadingText(heading)) || `heading-${index + 1}`;
    let id = baseId;
    let suffix = 2;

    while (document.getElementById(id) || usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
    }

    heading.id = id;
    usedIds.add(id);
    return id;
}

function render() {
    list.replaceChildren();
    toc.hidden = headings.length < minHeadings || window.innerWidth < hideBelow;

    headings.forEach((heading) => {
        const link = document.createElement("a");
        link.className = "reading-toc__link";
        link.href = `#${heading.id}`;
        link.textContent = heading.text;
        link.style.paddingLeft = `calc(var(--toc-link-padding-x) + ${
            (heading.level - 2) * 0.65
        }rem)`;

        list.append(link);
    });
}

function requestUpdate() {
    if (frame) {
        return;
    }

    frame = requestAnimationFrame(update);
}

function update() {
    frame = 0;
    toc.hidden = headings.length < minHeadings || window.innerWidth < hideBelow;

    if (!headings.length) {
        return;
    }

    const scrollY = window.scrollY;
    const contentTop = contentElement.getBoundingClientRect().top + scrollY;
    const readableDistance = contentElement.offsetHeight - window.innerHeight;
    const progress =
        readableDistance <= 0 ? 1 : clamp((scrollY - contentTop) / readableDistance);

    progressFill.style.height = `${progress * 100}%`;

    if (contentElement.getBoundingClientRect().bottom <= window.innerHeight + 8) {
        activeId = headings.at(-1)?.id ?? "";
        updateActiveLink();
        return;
    }

    const activationLine = Math.min(window.innerHeight * 0.35, 180);
    const activeHeading = [...headingElements]
        .reverse()
        .find((heading) => heading.getBoundingClientRect().top <= activationLine);

    activeId = activeHeading?.id ?? headings[0]?.id ?? "";
    updateActiveLink();
}

function updateActiveLink() {
    list.querySelectorAll(".reading-toc__link").forEach((link) => {
        const isActive = link.getAttribute("href") === `#${activeId}`;

        link.classList.toggle("reading-toc__link--active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function getHeadingText(heading) {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(".heading-anchor").forEach((anchor) => anchor.remove());
    return clone.textContent.trim();
}

function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function clamp(value) {
    return Math.min(1, Math.max(0, value));
}

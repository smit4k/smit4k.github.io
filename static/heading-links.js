const headings = document.querySelectorAll(
    ".post-content h2[id], .post-content h3[id], .post-content h4[id]",
);

headings.forEach((heading) => {
    if (heading.querySelector(":scope > .heading-anchor")) {
        return;
    }

    const anchor = document.createElement("a");
    const label = heading.textContent.trim();

    anchor.className = "heading-anchor";
    anchor.href = `#${heading.id}`;
    anchor.setAttribute("aria-label", `Link to section: ${label}`);
    anchor.title = `Link to section: ${label}`;
    anchor.textContent = "#";

    heading.append(anchor);
});

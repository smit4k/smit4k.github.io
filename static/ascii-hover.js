const art = document.querySelector(".home-ascii");

if (art) {
    const original = art.textContent;
    const lines = original.split("\n");
    const width = Math.max(...lines.map((line) => line.length));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const shades = "⠁⠃⠇⠏⠟⠿⡿⣿";
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const nodes = [];
    const walker = document.createTreeWalker(art, NodeFilter.SHOW_TEXT);
    let offset = 0;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        nodes.push({ node, text: node.data, offset });
        offset += node.data.length;
    }

    function distort(event) {
        if (motion.matches) return;

        const rect = art.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(art);
        const cellWidth = range.getBoundingClientRect().width / width;
        const cellHeight = rect.height / lines.length;

        const distorted = lines
            .map((line, row) => [...line].map((char, column) => {
                if (/[\s\u2800]/.test(char)) return char;
                const dx = rect.left + (column + 0.5) * cellWidth - event.clientX;
                const dy = rect.top + (row + 0.5) * cellHeight - event.clientY;
                const strength = Math.max(0, 1 - Math.hypot(dx, dy) / 90);
                const threshold = bayer[(row % 4) * 4 + (column % 4)] / 16;
                return strength > threshold
                    ? shades[Math.floor(strength * (shades.length - 1))]
                    : char;
            }).join(""))
            .join("\n");

        for (const { node, text, offset } of nodes) {
            node.data = distorted.slice(offset, offset + text.length);
        }
    }

    function restore() {
        for (const { node, text } of nodes) {
            node.data = text;
        }
    }

    art.addEventListener("mouseenter", distort);
    art.addEventListener("mousemove", distort);
    art.addEventListener("mouseleave", restore);
    motion.addEventListener("change", restore);
}

const art = document.querySelector(".home-ascii");

if (art) {
    const original = art.textContent;
    const lines = original.split("\n");
    const width = Math.max(...lines.map((line) => line.length));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const shades = ".:-=+*#%@";
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    function distort(event) {
        if (motion.matches) return;

        const rect = art.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(art);
        const cellWidth = range.getBoundingClientRect().width / width;
        const cellHeight = rect.height / lines.length;

        art.textContent = lines
            .map((line, row) => [...line].map((char, column) => {
                if (/\s/.test(char)) return char;
                const dx = rect.left + (column + 0.5) * cellWidth - event.clientX;
                const dy = rect.top + (row + 0.5) * cellHeight - event.clientY;
                const strength = Math.max(0, 1 - Math.hypot(dx, dy) / 90);
                const threshold = bayer[(row % 4) * 4 + (column % 4)] / 16;
                return strength > threshold
                    ? shades[Math.floor(strength * (shades.length - 1))]
                    : char;
            }).join(""))
            .join("\n");
    }

    function restore() {
        art.textContent = original;
    }

    art.addEventListener("mouseenter", distort);
    art.addEventListener("mousemove", distort);
    art.addEventListener("mouseleave", restore);
    motion.addEventListener("change", restore);
}

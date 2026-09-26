const art = document.querySelector(".home-ascii");

if (art) {
    const original = [...art.textContent];
    const finished = original.join("");
    const motionAllowed = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glyphs = ".,:;!+*#%@?/\\|-_";
    const shades = ".:-=+*#%@";
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const lines = finished.split("\n");
    const width = Math.max(...lines.map((line) => line.length));
    let x = 0;
    let y = 0;
    const positions = original.map((char) => {
        const position = [x, y];
        if (char === "\n") {
            x = 0;
            y++;
        } else {
            x++;
        }
        return position;
    });
    let revealing = false;
    let cursor = null;

    function dither() {
        const rect = art.getBoundingClientRect();
        const cellWidth = rect.width / width;
        const cellHeight = rect.height / lines.length;
        const radius = 90;
        art.textContent = original
            .map((char, index) => {
                if (/\s/.test(char)) return char;
                const [column, row] = positions[index];
                const dx = rect.left + (column + 0.5) * cellWidth - cursor.x;
                const dy = rect.top + (row + 0.5) * cellHeight - cursor.y;
                const strength = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
                const threshold = bayer[(row % 4) * 4 + (column % 4)] / 16;
                return strength > threshold
                    ? shades[Math.floor(strength * (shades.length - 1))]
                    : char;
            })
            .join("");
    }

    function updateCursor(event) {
        cursor = { x: event.clientX, y: event.clientY };
        if (!revealing) dither();
    }

    art.addEventListener("mouseenter", updateCursor);
    art.addEventListener("mousemove", updateCursor);
    art.addEventListener("mouseleave", () => {
        cursor = null;
        if (!revealing) art.textContent = finished;
    });

    if (motionAllowed && getComputedStyle(art).display !== "none") {
        const duration = 1600;
        const settleAt = original.map((char) =>
            /\s/.test(char) ? 0 : 100 + Math.random() * (duration - 100),
        );
        const start = performance.now();
        revealing = true;

        function tick() {
            const elapsed = performance.now() - start;
            art.textContent = original
                .map((char, index) =>
                    elapsed >= settleAt[index]
                        ? char
                        : glyphs[Math.floor(Math.random() * glyphs.length)],
                )
                .join("");

            if (elapsed >= duration) {
                clearInterval(timer);
                revealing = false;
                if (cursor) dither();
            }
        }

        const timer = setInterval(tick, 50);
        tick();
    }
}

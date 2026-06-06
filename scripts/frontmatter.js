export function stripFrontmatter(markdown) {
    return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function cleanFrontmatterValue(value) {
    return value.trim().replace(/^["']/, "").replace(/["']$/, "");
}

export function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
        return {};
    }

    const metadata = {};
    const lines = match[1].split("\n");

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

        if (!field) {
            continue;
        }

        const [, key, rawValue] = field;

        if (rawValue.trim()) {
            metadata[key] = cleanFrontmatterValue(rawValue);
            continue;
        }

        const continued = [];

        while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
            index += 1;
            continued.push(lines[index].trim());
        }

        if (continued.length) {
            metadata[key] = cleanFrontmatterValue(continued.join(" "));
        }
    }

    return metadata;
}

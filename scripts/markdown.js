import { stripFrontmatter } from "./frontmatter.js";
import { escapeHtml } from "./html.js";

function slugifyHeading(text) {
    const slug = text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[`*_~[\]!]/g, "")
        .replace(/\]\([^)]+\)/g, "")
        .replace(/&[a-z0-9#]+;/gi, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "section";
}

function postAssetPath(path) {
    if (/^(https?:|mailto:|#|\/)/.test(path)) {
        return path;
    }

    return `posts/${path}`;
}

function copyableCodeBlock(code) {
    return [
        '<div class="code-block">',
        '    <button class="code-copy-button" type="button" aria-label="Copy code to clipboard">copy</button>',
        `    <pre><code>${escapeHtml(code)}</code></pre>`,
        "</div>",
    ].join("\n");
}

function renderInline(text) {
    return escapeHtml(text)
        .replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (_, alt, src) =>
                `<img src="${postAssetPath(src)}" alt="${alt}" loading="lazy">`,
        )
        .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            (_, label, href) => `<a href="${href}">${label}</a>`,
        )
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/~~([^~]+)~~/g, "<s>$1</s>");
}

export function renderMarkdown(markdown, options = {}) {
    const lines = stripFrontmatter(markdown).replaceAll("\r\n", "\n").split("\n");
    const html = [];
    const usedHeadingSlugs = new Map();
    let index = 0;
    const postSlug = options.postSlug || "";

    function uniqueHeadingSlug(text) {
        const baseSlug = slugifyHeading(text);
        const count = usedHeadingSlugs.get(baseSlug) || 0;

        usedHeadingSlugs.set(baseSlug, count + 1);
        return count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    }

    function parseTableRow(row) {
        return row
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim());
    }

    function collectParagraph() {
        const paragraph = [];

        while (
            index < lines.length &&
            lines[index].trim() &&
            !/^(#{1,6})\s+/.test(lines[index]) &&
            !/^[-*]\s+/.test(lines[index]) &&
            !/^\d+\.\s+/.test(lines[index]) &&
            !/^```/.test(lines[index]) &&
            !/^:::/.test(lines[index]) &&
            !/^---+$/.test(lines[index].trim())
        ) {
            paragraph.push(lines[index].trim());
            index += 1;
        }

        if (paragraph.length) {
            html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
        }
    }

    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        if (trimmed.startsWith("```")) {
            const code = [];
            index += 1;

            while (index < lines.length && !lines[index].startsWith("```")) {
                code.push(lines[index]);
                index += 1;
            }

            index += 1;
            html.push(copyableCodeBlock(code.join("\n")));
            continue;
        }

        if (trimmed.startsWith(":::")) {
            const [, type = "", label = ""] = trimmed.match(/^:::(\w+)?\s*(.*)$/) || [];
            const body = [];
            index += 1;

            while (index < lines.length && !lines[index].trim().startsWith(":::")) {
                body.push(lines[index]);
                index += 1;
            }

            index += 1;
            html.push(
                `<aside class="callout${type ? ` callout-${type}` : ""}">${label ? `<p class="callout-title">${renderInline(label)}</p>` : ""}<div class="callout-body">${renderMarkdown(body.join("\n"), options)}</div></aside>`,
            );
            continue;
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const level = Math.min(heading[1].length, 4);
            const content = renderInline(heading[2]);
            const id = uniqueHeadingSlug(heading[2]);
            const href = postSlug
                ? `#post/${encodeURIComponent(postSlug)}/${encodeURIComponent(id)}`
                : `#${id}`;
            const anchor =
                level >= 2 && level <= 3
                    ? `<a class="heading-anchor" href="${href}" aria-label="Link to section: ${escapeHtml(heading[2])}" title="Link to section: ${escapeHtml(heading[2])}">¶</a>`
                    : "";

            html.push(`<h${level} id="${id}">${content}${anchor}</h${level}>`);
            index += 1;
            continue;
        }

        if (
            trimmed.startsWith("|") &&
            index + 1 < lines.length &&
            /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(
                lines[index + 1].trim(),
            )
        ) {
            const headers = parseTableRow(trimmed);
            const rows = [];
            index += 2;

            while (index < lines.length && lines[index].trim().startsWith("|")) {
                rows.push(parseTableRow(lines[index]));
                index += 1;
            }

            html.push(`
                <table>
                    <thead>
                        <tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${rows
                            .map(
                                (row) =>
                                    `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`,
                            )
                            .join("")}
                    </tbody>
                </table>
            `);
            continue;
        }

        if (/^---+$/.test(trimmed)) {
            html.push("<hr>");
            index += 1;
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            const items = [];

            while (index < lines.length) {
                const current = lines[index];
                const trimmedCurrent = current.trim();

                if (/^[-*]\s+/.test(trimmedCurrent)) {
                    items.push(trimmedCurrent.replace(/^[-*]\s+/, ""));
                    index += 1;
                    continue;
                }

                // Treat indented lines that are not nested lists as continuations
                const contMatch = current.match(/^\s+(.+)$/);
                if (contMatch && items.length) {
                    const contText = contMatch[1].trim();
                    if (!/^[-*]\s+/.test(contText) && !/^\d+\.\s+/.test(contText)) {
                        items[items.length - 1] += " " + contText;
                        index += 1;
                        continue;
                    }
                }

                break;
            }

            html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];

            while (index < lines.length) {
                const current = lines[index];
                const trimmedCurrent = current.trim();

                if (/^\d+\.\s+/.test(trimmedCurrent)) {
                    items.push(trimmedCurrent.replace(/^\d+\.\s+/, ""));
                    index += 1;
                    continue;
                }

                // Treat indented lines that are not nested lists as continuations
                const contMatch = current.match(/^\s+(.+)$/);
                if (contMatch && items.length) {
                    const contText = contMatch[1].trim();
                    if (!/^[-*]\s+/.test(contText) && !/^\d+\.\s+/.test(contText)) {
                        items[items.length - 1] += " " + contText;
                        index += 1;
                        continue;
                    }
                }

                break;
            }

            html.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
            continue;
        }

        collectParagraph();
    }

    return html.join("\n");
}

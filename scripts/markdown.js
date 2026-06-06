import { stripFrontmatter } from "./frontmatter.js";
import { escapeHtml } from "./html.js";

function postAssetPath(path) {
    if (/^(https?:|mailto:|#|\/)/.test(path)) {
        return path;
    }

    return `posts/${path}`;
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

export function renderMarkdown(markdown) {
    const lines = stripFrontmatter(markdown).replaceAll("\r\n", "\n").split("\n");
    const html = [];
    let index = 0;

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
            html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
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
                `<aside class="callout${type ? ` callout-${type}` : ""}">${label ? `<p class="callout-title">${renderInline(label)}</p>` : ""}<div class="callout-body">${renderMarkdown(body.join("\n"))}</div></aside>`,
            );
            continue;
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const level = Math.min(heading[1].length, 4);
            html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
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

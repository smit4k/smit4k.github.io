import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const postsDir = path.join(projectRoot, "posts");
const postFilesPath = path.join(projectRoot, "scripts", "post-files.js");
const rssPath = path.join(projectRoot, "rss.xml");

const site = {
    title: "smit",
    description: "Smit: software, robotics, Linux, and current setup.",
    siteUrl: "https://smit.codes",
    author: "smit@smit.codes",
};

function stripFrontmatter(markdown) {
    return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function cleanFrontmatterValue(value) {
    return value.trim().replace(/^["']/, "").replace(/["']$/, "");
}

function parseFrontmatter(markdown) {
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

function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function titleFromSlug(slug) {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function buildPostUrl(slug) {
    return `${site.siteUrl}/#post/${slug}`;
}

function toRfc822Date(date) {
    return new Date(`${date}T00:00:00Z`).toUTCString();
}

function buildItemXml(post) {
    return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(post.url)}</link>`,
        `      <guid>${escapeXml(post.url)}</guid>`,
        `      <pubDate>${escapeXml(toRfc822Date(post.date))}</pubDate>`,
        `      <description>${escapeXml(post.description)}</description>`,
        "    </item>",
    ].join("\n");
}

async function readPosts() {
    const filenames = (await fs.readdir(postsDir))
        .filter((file) => file.endsWith(".md"))
        .sort();

    const posts = await Promise.all(
        filenames.map(async (file) => {
            const slug = file.replace(/\.md$/, "");
            const markdown = await fs.readFile(path.join(postsDir, file), "utf8");
            const metadata = parseFrontmatter(markdown);
            const content = stripFrontmatter(markdown).trim();

            return {
                file,
                slug,
                title: metadata.title || titleFromSlug(slug),
                date: metadata.date || "",
                description: metadata.description || content.split("\n")[0] || "",
                url: buildPostUrl(slug),
            };
        }),
    );

    return posts.sort((first, second) => {
        if (first.date !== second.date) {
            return second.date.localeCompare(first.date);
        }

        return first.title.localeCompare(second.title);
    });
}

async function writePostFiles(posts) {
    const lines = [
        "export const postFiles = [",
        ...posts.map((post) => `  "${post.file}",`),
        "];",
        "",
    ];

    await fs.writeFile(postFilesPath, lines.join("\n"), "utf8");
}

async function writeRss(posts) {
    const latestDate = posts.find((post) => post.date)?.date;
    const feed = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        `    <title>${escapeXml(site.title)}</title>`,
        `    <link>${escapeXml(site.siteUrl)}</link>`,
        `    <description>${escapeXml(site.description)}</description>`,
        `    <language>en-us</language>`,
        `    <managingEditor>${escapeXml(site.author)}</managingEditor>`,
        `    <atom:link href="${escapeXml(`${site.siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
        latestDate ? `    <lastBuildDate>${escapeXml(toRfc822Date(latestDate))}</lastBuildDate>` : "",
        ...posts.filter((post) => post.date).map(buildItemXml),
        "  </channel>",
        "</rss>",
        "",
    ]
        .filter(Boolean)
        .join("\n");

    await fs.writeFile(rssPath, feed, "utf8");
}

const posts = await readPosts();
await writePostFiles(posts);
await writeRss(posts);

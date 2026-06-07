import { parseFrontmatter, stripFrontmatter } from "./frontmatter.js";
import { installCodeBlockCopy } from "./code-copy.js";
import { escapeHtml } from "./html.js";
import { renderNotFound } from "./not-found.js";
import { renderMarkdown } from "./markdown.js";
import { postFiles } from "./post-files.js";
import { estimateReadTime } from "./read-time.js";

const posts = postFiles.map((file) => ({
    file,
    slug: file.replace(/\.md$/, ""),
}));

const postList = document.querySelector("#post-list");
const allPostList = document.querySelector("#all-post-list");
const allPostsView = document.querySelector("#all-posts-view");
const allPostsCount = document.querySelector("#all-posts-count");
const allPostsYears = document.querySelector("#all-posts-years");
const postView = document.querySelector("#post-view");
const homeView = document.querySelector("#home-view");
const notFoundView = document.querySelector("#not-found-view");
const homeBannerFrame = document.querySelector("#home-banner-frame");
const desktopBannerMedia = window.matchMedia("(min-width: 48.001rem)");

installCodeBlockCopy(postView);

function formatDate(date) {
    if (!date) {
        return "";
    }

    const [year, month, day] = date.split("-");
    return `${month}.${day}.${year}`;
}

function titleFromSlug(slug) {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function postYearSpan() {
    const years = posts
        .map((post) => Number(post.date.split("-")[0]))
        .filter((year) => Number.isFinite(year));

    if (!years.length) {
        return 0;
    }

    return Math.max(...years) - Math.min(...years);
}

function clearCurrentPostLinks() {
    document.querySelectorAll("[data-post]").forEach((link) => {
        link.removeAttribute("aria-current");
    });
}

function markCurrentPost(slug) {
    document.querySelectorAll("[data-post]").forEach((link) => {
        link.toggleAttribute("aria-current", link.dataset.post === slug);
    });
}

function parseHashRoute(hash) {
    if (!hash) {
        return { view: "home" };
    }

    if (hash === "#posts") {
        return { view: "posts" };
    }

    const pathMatch = hash.match(/^#post\/([^/?#]+)(?:\/([^?#]+))?$/);
    if (pathMatch) {
        return {
            view: "post",
            slug: decodeURIComponent(pathMatch[1]),
            section: pathMatch[2] ? decodeURIComponent(pathMatch[2]) : "",
        };
    }

    const legacyMatch = hash.match(/^#post\/([^?]+)(?:\?section=(.+))?$/);
    if (legacyMatch) {
        return {
            view: "post",
            slug: decodeURIComponent(legacyMatch[1]),
            section: legacyMatch[2] ? decodeURIComponent(legacyMatch[2]) : "",
        };
    }

    return { view: "not-found" };
}

function scrollToPostSection(sectionId) {
    if (!sectionId) {
        window.scrollTo(0, 0);
        return;
    }

    const target = document.getElementById(sectionId);
    if (!target) {
        window.scrollTo(0, 0);
        return;
    }

    target.scrollIntoView({ block: "start" });
}

function showHomeView() {
    homeView.hidden = false;
    allPostsView.hidden = true;
    postView.hidden = true;
    notFoundView.hidden = true;
    postView.innerHTML = "";
    clearCurrentPostLinks();
}

function syncHomeBanner() {
    if (!homeBannerFrame) {
        return;
    }

    if (!desktopBannerMedia.matches) {
        homeBannerFrame.replaceChildren();
        return;
    }

    if (homeBannerFrame.querySelector(".home-banner")) {
        return;
    }

    const banner = document.createElement("img");
    banner.className = "home-banner";
    banner.src = homeBannerFrame.dataset.bannerSrc || "";
    banner.alt = "";
    banner.setAttribute("aria-hidden", "true");
    homeBannerFrame.replaceChildren(banner);
}

function showAllPostsView() {
    homeView.hidden = true;
    postView.hidden = true;
    notFoundView.hidden = true;
    postView.innerHTML = "";
    allPostsView.hidden = false;
    window.scrollTo(0, 0);
    clearCurrentPostLinks();
}

function showNotFoundView() {
    homeView.hidden = true;
    allPostsView.hidden = true;
    postView.hidden = true;
    notFoundView.hidden = false;
    postView.innerHTML = "";
    window.scrollTo(0, 0);
    clearCurrentPostLinks();
}

function renderPostList() {
    postList.innerHTML = posts
        .slice(0, 3)
        .map(
            (post) => `
                <li>
                    <span>
                        <a href="#post/${post.slug}" data-post="${post.slug}">${post.title}</a>
                        ${post.description ? `<p>${escapeHtml(post.description)}</p>` : ""}
                    </span>
                    <time datetime="${post.date}">${formatDate(post.date)}</time>
                </li>
            `,
        )
        .join("");
}

function groupPostsByYear() {
    return posts.reduce((groups, post) => {
        const year = post.date ? post.date.split("-")[0] : "undated";

        if (!groups.has(year)) {
            groups.set(year, []);
        }

        groups.get(year).push(post);
        return groups;
    }, new Map());
}

function renderAllPostList() {
    const yearSpan = postYearSpan();

    allPostsCount.textContent = `${posts.length} ${
        posts.length === 1 ? "entry" : "entries"
    }`;
    allPostsYears.textContent = `${yearSpan} ${yearSpan === 1 ? "year" : "years"}`;
    allPostList.innerHTML = Array.from(groupPostsByYear().entries())
        .map(
            ([year, yearPosts]) => `
                <li class="post-year-group">
                    <h3>${escapeHtml(year)}</h3>
                    <ul>
                        ${yearPosts
                            .map(
                                (post) => `
                                    <li>
                                        <a href="#post/${post.slug}" data-post="${post.slug}">${post.title}</a>
                                        <time datetime="${post.date}">${formatDate(post.date)}</time>
                                    </li>
                                `,
                            )
                            .join("")}
                    </ul>
                </li>
            `,
        )
        .join("");
}

async function loadPostMetadata() {
    await Promise.all(
        posts.map(async (post) => {
            const response = await fetch(`posts/${post.file}`);

            if (!response.ok) {
                post.title = titleFromSlug(post.slug);
                post.date = "";
                post.description = "";
                post.readTime = 1;
                return;
            }

            const markdown = await response.text();
            const metadata = parseFrontmatter(markdown);

            post.title = metadata.title || titleFromSlug(post.slug);
            post.date = metadata.date || "";
            post.description = metadata.description || "";
            post.readTime = estimateReadTime(stripFrontmatter(markdown));
        }),
    );

    posts.sort((first, second) => {
        if (first.date !== second.date) {
            return second.date.localeCompare(first.date);
        }

        return first.title.localeCompare(second.title);
    });
}

function renderPost(post, markdown) {
    const metadata = parseFrontmatter(markdown);
    const title = metadata.title || post.title;
    const date = metadata.date || post.date;
    const description = metadata.description || post.description;
    const readTime = post.readTime || estimateReadTime(stripFrontmatter(markdown));

    postView.innerHTML = `
        <nav class="breadcrumbs" aria-label="breadcrumbs">
            <a href="#">home</a>
            <span aria-hidden="true">/</span>
            <a href="#posts">posts</a>
            <span aria-hidden="true">/</span>
            <a href="#post/${post.slug}">${escapeHtml(title)}</a>
        </nav>
        <header class="post-header">
            <h1>${escapeHtml(title)}</h1>
            <p class="post-meta">
                ${readTime ? `<span>${readTime} min read</span>` : ""}
                ${readTime && date ? `<span aria-hidden="true"> · </span>` : ""}
                ${date ? `<time datetime="${date}">${formatDate(date)}</time>` : ""}
            </p>
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </header>
        <hr class="post-divider">
        ${renderMarkdown(markdown, { postSlug: post.slug })}
    `;
}

async function showPost(slug, sectionId = "") {
    const post = posts.find((item) => item.slug === slug);

    if (!post) {
        showNotFoundView();
        return;
    }

    homeView.hidden = true;
    allPostsView.hidden = true;
    notFoundView.hidden = true;
    postView.hidden = false;
    postView.innerHTML = `<p>loading...</p>`;

    const response = await fetch(`posts/${post.file}`);
    if (!response.ok) {
        postView.innerHTML =
            '<a class="post-back" href="#">back to home</a><p>could not load post.</p>';
        return;
    }

    renderPost(post, await response.text());
    markCurrentPost(slug);
    scrollToPostSection(sectionId);
}

function syncPostFromHash() {
    const route = parseHashRoute(location.hash);

    if (route.view === "post") {
        showPost(route.slug, route.section);
        return;
    }

    if (route.view === "posts") {
        showAllPostsView();
        return;
    }

    if (route.view === "not-found") {
        showNotFoundView();
        return;
    }

    showHomeView();
}

async function initPosts() {
    syncHomeBanner();
    await loadPostMetadata();
    renderPostList();
    renderAllPostList();
    notFoundView.innerHTML = renderNotFound({
        homeHref: "#",
        postsHref: "#posts",
    });
    syncPostFromHash();
}

initPosts();
window.addEventListener("hashchange", syncPostFromHash);
desktopBannerMedia.addEventListener("change", syncHomeBanner);

import { escapeHtml } from "./html.js";

export function renderNotFound({ homeHref, postsHref }) {
    return `
        <nav class="breadcrumbs" aria-label="breadcrumbs">
            <a href="${escapeHtml(homeHref)}">home</a>
            <span aria-hidden="true">/</span>
            <span class="muted">404</span>
        </nav>

        <h1>404</h1>
        <p>the page you were looking for does not exist.</p>

        <div class="not-found-links">
            <a href="${escapeHtml(homeHref)}">go home</a>
            <a href="${escapeHtml(postsHref)}">browse posts</a>
        </div>
    `;
}

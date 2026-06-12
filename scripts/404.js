import { renderNotFound } from "./not-found.js";

document.querySelector("#not-found-view").innerHTML = renderNotFound({
    homeHref: "/",
    postsHref: "/#writing",
});

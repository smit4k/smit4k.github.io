export function estimateReadTime(markdown) {
    const humanReadableText = Array.from(markdown)
        .filter((character) => /[\p{L}\p{N}\s]/u.test(character))
        .join("");
    const wordCount = humanReadableText.trim().split(/\s+/).filter(Boolean).length;

    return Math.max(Math.floor(wordCount / 200), 1);
}

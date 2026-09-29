export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function safeCachedImagePath(value: unknown): string | null {
    if (typeof value !== "string") return null;
    return /^resources\/images\/cache\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|gif|webp)$/i.test(value) ? value : null;
}

/**
 * Initials for a poster fallback tile: first letter of the first two words, or
 * the first two letters of a single word, always uppercase, "?" when empty.
 * Punctuation is stripped first so a name like "!Xtreme" never yields "!".
 */
export function gameInitials(name: unknown): string {
    if (typeof name !== "string") return "?";
    const words = name
        .replace(/[^\w\s]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

export interface PosterFallbackOptions {
    /** Visual order of the glyph and initials. Defaults to icon first. */
    order?: "icon-first" | "initials-first";
    /** Mark the tile aria-hidden (used where the name is already announced nearby). */
    ariaHidden?: boolean;
}

/**
 * The "no cover art" fallback tile: a game glyph plus the name's initials.
 * The `order` knob preserves the two markup orderings that existed before this
 * module (icon-first on most screens, initials-first on My Rigs).
 */
export function posterFallbackHtml(name: string, options: PosterFallbackOptions = {}): string {
    const initials = `<span class="fallback-initials">${escapeHtml(gameInitials(name))}</span>`;
    const icon = `<span class="fallback-icon">🎮</span>`;
    const inner = options.order === "initials-first" ? `${initials}${icon}` : `${icon}${initials}`;
    const ariaHidden = options.ariaHidden ? ` aria-hidden="true"` : "";
    return `<div class="poster-fallback"${ariaHidden}>${inner}</div>`;
}

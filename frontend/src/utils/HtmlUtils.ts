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

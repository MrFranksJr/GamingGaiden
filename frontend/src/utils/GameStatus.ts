import {escapeHtml} from "./HtmlUtils";

/**
 * The one owner of a game status's slug, display label, and pill markup.
 *
 * A status flows: category ("In Progress") -> slug ("in-progress") -> pill.
 * `categorizeGameStatus` (in SummaryStatsCalculator) still produces the category;
 * this module owns everything downstream so the slug rule and the label
 * vocabulary can't diverge across screens.
 */

/** Canonical CSS-safe slug for a status category: lowercased, spaces/underscores to dashes. */
export function statusSlug(category: string): string {
    return category.toLowerCase().replace(/[\s_]+/g, "-");
}

// Slugs whose pill label differs from the title-cased category. Session History
// diary cards say "Finished"/"Playing" rather than "Completed"/"In Progress".
const PILL_LABEL_OVERRIDES: Record<string, string> = {
    completed: "Finished",
    "in-progress": "Playing"
};

/** Display label for a status slug on a pill (applies the Finished/Playing overrides). */
export function statusPillLabel(slug: string): string {
    if (PILL_LABEL_OVERRIDES[slug]) return PILL_LABEL_OVERRIDES[slug];
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export interface StatusPillOptions {
    /** "game" -> .game-status-pill (grids), "hero" -> .hero-status-pill (detail/diary headers). */
    variant?: "game" | "hero";
    /** Use the Finished/Playing pill labels instead of the raw category text. */
    relabel?: boolean;
}

/** A status pill: `<span class="<variant>-status-pill status-<slug>">label</span>`. */
export function statusPillHtml(category: string, options: StatusPillOptions = {}): string {
    const slug = statusSlug(category);
    const cssClass = options.variant === "hero" ? "hero-status-pill" : "game-status-pill";
    const label = options.relabel ? statusPillLabel(slug) : category;
    return `<span class="${cssClass} status-${escapeHtml(slug)}">${escapeHtml(label)}</span>`;
}

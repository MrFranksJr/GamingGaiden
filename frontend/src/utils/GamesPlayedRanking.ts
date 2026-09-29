import {formatPlaytimeCompact} from "./TimeUtils";

/**
 * Per-game bar colours for any ranked "games played" list (Session History
 * sidebars and the My Rigs "Games on this rig" list). Assignment is INDEX-BASED
 * by playtime rank, so a game's colour is not stable across different periods or
 * rigs. This is the single owner of the palette; screens must not re-declare it.
 */
export const GAMES_PLAYED_PALETTE = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#38bdf8", // Sky blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#a855f7", // Violet
    "#06b6d4", // Cyan
    "#f43f5e" // Rose
];

/** A game with its already-summed playtime, ready to be ranked. */
export interface GamePlaytime {
    gameName: string;
    minutes: number;
    iconPath: string | null;
}

/** One ranked row in a games-played list: a bar with a colour and a share. */
export interface GamePlayedRow {
    gameName: string;
    iconPath: string | null;
    minutes: number;
    formatted: string; // compact "2h 5m"
    percentage: number; // rounded integer 0..100, share of the summed minutes
    color: string;
    detailHref: string; // "#game-detail?name=..."
}

/**
 * Ranks pre-summed games by playtime: sorts by minutes desc (ties by name),
 * assigns an index-based palette colour, computes each row's percentage share of
 * the summed minutes, and formats the duration. Callers do their own domain
 * aggregation (session totals vs stored per-game play_time) then hand the sums here.
 */
export function rankGamesPlayed(games: GamePlaytime[]): GamePlayedRow[] {
    const totalMinutes = games.reduce((sum, game) => sum + game.minutes, 0);
    return games
        .slice()
        .sort((a, b) => b.minutes - a.minutes || a.gameName.localeCompare(b.gameName))
        .map((game, index) => ({
            gameName: game.gameName,
            iconPath: game.iconPath,
            minutes: game.minutes,
            formatted: formatPlaytimeCompact(game.minutes),
            percentage: totalMinutes > 0 ? Math.round((game.minutes / totalMinutes) * 100) : 0,
            color: GAMES_PLAYED_PALETTE[index % GAMES_PLAYED_PALETTE.length],
            detailHref: `#game-detail?name=${encodeURIComponent(game.gameName)}`
        }));
}

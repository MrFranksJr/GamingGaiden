export interface Game {
    name: string;
    play_time: number;
    session_count: number;
    status: string;
    completed: string;
    exe_name?: string | null;
    last_play_date?: number | string | null;
    icon_path?: string | null;
    gaming_pc_name?: string | null;
    release_date?: string | null;
}

export interface Session {
    game_name: string;
    start_time: number | string;
    duration: number;
}

export interface DailyPlaytime {
    play_date: string;
    play_time: number;
}

export interface GamingPC {
    name: string;
    in_use: string;
    icon_path?: string | null;
    cost?: string | null;
    currency?: string | null;
    start_date?: number | string | null;
    end_date?: number | string | null;
    total_play_time?: number;
}

export interface GameData {
    schema_version: 1;
    games: Game[];
    session_history: Session[];
    daily_playtime: DailyPlaytime[];
    gaming_pcs: GamingPC[];
    export_date?: string;
    hash?: string;
}

declare global {
    interface Window {
        gamingGaidenData?: unknown;
    }
}

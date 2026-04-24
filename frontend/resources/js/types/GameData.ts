export interface Game {
    name: string;
    play_time: number;
    session_count: number;
    status: string;
    completed: string;
    last_play_date?: string;
    gaming_pc_name?: string;
}

export interface Session {
    game_name: string;
    start_time: string;
    duration: number;
}

export interface DailyPlaytime {
    play_date: string;
    play_time: number;
}

export interface GamingPC {
    name: string;
    in_use: string;
}

export interface GameData {
    games: Game[];
    session_history: Session[];
    daily_playtime: DailyPlaytime[];
    gaming_pcs: GamingPC[];
    export_date?: string;
    hash?: string;
}

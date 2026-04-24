import { GameData } from '../resources/js/types/GameData';

export const mockData: GameData = {
    games: [
        { name: 'Game A', play_time: 120, session_count: 5, status: 'playing', completed: 'FALSE' },
        { name: 'Game B', play_time: 60, session_count: 2, status: 'finished', completed: 'TRUE' }
    ],
    session_history: [
        { game_name: 'Game A', start_time: '2023-01-01 10:00', duration: 30 },
        { game_name: 'Game B', start_time: '2023-01-02 11:00', duration: 60 }
    ],
    daily_playtime: [
        { play_date: '2023-01-01', play_time: 30 },
        { play_date: '2023-01-02', play_time: 60 }
    ],
    gaming_pcs: []
}

export type GameMode = 'linear' | 'rotation';
export type GameStatus = 'lobby' | 'active' | 'paused' | 'ended';
export type ChallengeType = 'riddle' | 'qr' | 'both';
export type PlayMode = 'solo' | 'group';

export interface Game {
  id: string;
  title: string;
  room_code: string;
  mode: GameMode;
  time_limit_minutes: number | null;
  status: GameStatus;
  center_lat: number;
  center_lng: number;
  admin_id: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Station {
  id: string;
  game_id: string;
  name: string;
  order_index: number;
  lat: number;
  lng: number;
  challenge_type: ChallengeType;
  riddle_text: string | null;
  riddle_answer: string | null;
  qr_value: string | null;
  hint_text: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  game_id: string;
  name: string;
  created_at: string;
}

export interface Participant {
  id: string;
  game_id: string;
  group_id: string | null;
  name: string;
  joined_at: string;
}

export interface Completion {
  id: string;
  participant_id: string | null;
  group_id: string | null;
  station_id: string;
  completed_at: string;
  mode: PlayMode;
}

export interface GameWithStations extends Game {
  stations: Station[];
}

export interface ParticipantSession {
  participantId: string;
  gameId: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  mode: PlayMode;
}

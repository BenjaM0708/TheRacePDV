/*
# MapQuest Game - Initial Schema

1. New Tables
- `games`: treasure hunt sessions created by admins
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `room_code` (text, 6 chars, unique, not null)
  - `mode` (text, 'linear'|'rotation', not null)
  - `time_limit_minutes` (integer, nullable)
  - `status` (text, 'lobby'|'active'|'paused'|'ended', default 'lobby')
  - `center_lat` (numeric, not null)
  - `center_lng` (numeric, not null)
  - `admin_id` (uuid, references auth.users, not null)
  - `started_at` (timestamptz, nullable)
  - `ended_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())

- `stations`: challenge locations within a game
  - `id` (uuid, primary key)
  - `game_id` (uuid, references games, on delete cascade)
  - `name` (text, not null)
  - `order_index` (integer, not null)
  - `lat` (numeric, not null)
  - `lng` (numeric, not null)
  - `challenge_type` (text, 'riddle'|'qr'|'both', not null)
  - `riddle_text` (text, nullable)
  - `riddle_answer` (text, nullable)
  - `qr_value` (text, nullable)
  - `hint_text` (text, nullable)
  - `created_at` (timestamptz, default now())

- `groups`: participant groups within a game
  - `id` (uuid, primary key)
  - `game_id` (uuid, references games, on delete cascade)
  - `name` (text, not null)
  - `created_at` (timestamptz, default now())

- `participants`: individual participants
  - `id` (uuid, primary key)
  - `game_id` (uuid, references games, on delete cascade)
  - `group_id` (uuid, references groups, nullable, on delete set null)
  - `name` (text, not null)
  - `joined_at` (timestamptz, default now())

- `completions`: records of completed stations
  - `id` (uuid, primary key)
  - `participant_id` (uuid, references participants, nullable, on delete cascade)
  - `group_id` (uuid, references groups, nullable, on delete cascade)
  - `station_id` (uuid, references stations, on delete cascade)
  - `completed_at` (timestamptz, default now())
  - `mode` (text, 'solo'|'group', not null)

2. Security
- Enable RLS on all tables.
- Games: admin-scoped (admin_id = auth.uid()).
- Stations, groups, participants, completions: accessible through parent game ownership or via anon for participant flows.
- Participant-facing tables allow anon access for join/gameplay since no auth is required for participants.
*/

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  room_code text UNIQUE NOT NULL,
  mode text NOT NULL CHECK (mode IN ('linear', 'rotation')),
  time_limit_minutes integer,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'paused', 'ended')),
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN ('riddle', 'qr', 'both')),
  riddle_text text,
  riddle_answer text,
  qr_value text,
  hint_text text,
  created_at timestamptz DEFAULT now()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  name text NOT NULL,
  joined_at timestamptz DEFAULT now()
);

-- Completions table
CREATE TABLE IF NOT EXISTS completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  mode text NOT NULL CHECK (mode IN ('solo', 'group'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_admin_id ON games(admin_id);
CREATE INDEX IF NOT EXISTS idx_stations_game_id ON stations(game_id);
CREATE INDEX IF NOT EXISTS idx_groups_game_id ON groups(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_game_id ON participants(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_completions_participant_id ON completions(participant_id);
CREATE INDEX IF NOT EXISTS idx_completions_group_id ON completions(group_id);
CREATE INDEX IF NOT EXISTS idx_completions_station_id ON completions(station_id);

-- RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- Games policies: admin owns, participants can read by room code
DROP POLICY IF EXISTS "games_select_admin" ON games;
CREATE POLICY "games_select_admin" ON games FOR SELECT
  TO authenticated USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "games_select_anon" ON games;
CREATE POLICY "games_select_anon" ON games FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "games_insert_admin" ON games;
CREATE POLICY "games_insert_admin" ON games FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "games_update_admin" ON games;
CREATE POLICY "games_update_admin" ON games FOR UPDATE
  TO authenticated USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "games_delete_admin" ON games;
CREATE POLICY "games_delete_admin" ON games FOR DELETE
  TO authenticated USING (auth.uid() = admin_id);

-- Stations: admin through game, anon readable for gameplay
DROP POLICY IF EXISTS "stations_select_all" ON stations;
CREATE POLICY "stations_select_all" ON stations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "stations_insert_admin" ON stations;
CREATE POLICY "stations_insert_admin" ON stations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = stations.game_id AND games.admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "stations_update_admin" ON stations;
CREATE POLICY "stations_update_admin" ON stations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = stations.game_id AND games.admin_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = stations.game_id AND games.admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "stations_delete_admin" ON stations;
CREATE POLICY "stations_delete_admin" ON stations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = stations.game_id AND games.admin_id = auth.uid())
  );

-- Groups: readable by all for gameplay, admin can manage
DROP POLICY IF EXISTS "groups_select_all" ON groups;
CREATE POLICY "groups_select_all" ON groups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "groups_insert_admin" ON groups;
CREATE POLICY "groups_insert_admin" ON groups FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = groups.game_id AND games.admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "groups_update_admin" ON groups;
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = groups.game_id AND games.admin_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = groups.game_id AND games.admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "groups_delete_admin" ON groups;
CREATE POLICY "groups_delete_admin" ON groups FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = groups.game_id AND games.admin_id = auth.uid())
  );

-- Participants: readable by all for gameplay, insert by anon for join flow
DROP POLICY IF EXISTS "participants_select_all" ON participants;
CREATE POLICY "participants_select_all" ON participants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "participants_insert_all" ON participants;
CREATE POLICY "participants_insert_all" ON participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "participants_update_admin" ON participants;
CREATE POLICY "participants_update_admin" ON participants FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = participants.game_id AND games.admin_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = participants.game_id AND games.admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "participants_delete_admin" ON participants;
CREATE POLICY "participants_delete_admin" ON participants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = participants.game_id AND games.admin_id = auth.uid())
  );

-- Completions: readable by all, insert by anon for gameplay
DROP POLICY IF EXISTS "completions_select_all" ON completions;
CREATE POLICY "completions_select_all" ON completions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "completions_insert_all" ON completions;
CREATE POLICY "completions_insert_all" ON completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "completions_update_admin" ON completions;
CREATE POLICY "completions_update_admin" ON completions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM stations
      JOIN games ON games.id = stations.game_id
      WHERE stations.id = completions.station_id AND games.admin_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM stations
      JOIN games ON games.id = stations.game_id
      WHERE stations.id = completions.station_id AND games.admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "completions_delete_admin" ON completions;
CREATE POLICY "completions_delete_admin" ON completions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM stations
      JOIN games ON games.id = stations.game_id
      WHERE stations.id = completions.station_id AND games.admin_id = auth.uid()
    )
  );

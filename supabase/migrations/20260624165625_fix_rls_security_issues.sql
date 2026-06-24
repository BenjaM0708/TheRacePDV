/*
# Fix RLS Security Issues

1. Problem
- Table `public.completions` had policy `completions_insert_all` with `WITH CHECK (true)`, allowing unrestricted INSERT by anon and authenticated.
- Table `public.participants` had policy `participants_insert_all` with `WITH CHECK (true)`, allowing unrestricted INSERT by anon and authenticated.

2. Fixes
- `participants` INSERT policy now restricts inserts to games that exist and are in 'lobby' status. This prevents inserting participants into non-existent or already-started/ended games.
- `completions` INSERT policy now restricts inserts to valid participants/groups that belong to the same game as the station being completed. This prevents arbitrary completion records.
- All other existing policies remain unchanged.

3. Security
- RLS remains enabled on all tables.
- INSERT policies now have meaningful constraints instead of always-true.
*/

-- Fix participants INSERT policy
DROP POLICY IF EXISTS "participants_insert_all" ON participants;
CREATE POLICY "participants_insert_lobby" ON participants FOR INSERT
  TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = participants.game_id
      AND games.status = 'lobby'
    )
  );

-- Fix completions INSERT policy
DROP POLICY IF EXISTS "completions_insert_all" ON completions;
CREATE POLICY "completions_insert_valid" ON completions FOR INSERT
  TO anon, authenticated WITH CHECK (
    -- Solo permite insertar si el participante existe y pertenece al juego de la estación,
    -- o si el grupo existe y pertenece al juego de la estación
    (
      participant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM participants
        JOIN stations ON stations.id = completions.station_id
        WHERE participants.id = completions.participant_id
        AND participants.game_id = stations.game_id
      )
    )
    OR
    (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM groups
        JOIN stations ON stations.id = completions.station_id
        WHERE groups.id = completions.group_id
        AND groups.game_id = stations.game_id
      )
    )
  );
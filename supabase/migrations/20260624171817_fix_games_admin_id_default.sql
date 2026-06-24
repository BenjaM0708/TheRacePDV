/*
# Fix games admin_id default

1. Problem
- The `games` table requires `admin_id` on insert, but the frontend does not pass it.
- The RLS policy `games_insert_admin` checks `auth.uid() = admin_id`, so inserts fail when the client omits the column.

2. Fix
- Alter `games.admin_id` to have a default of `auth.uid()` so the authenticated user's ID is filled automatically when the client omits it.
- This makes `.insert({ title, room_code, ... })` work without threading `admin_id` through the frontend.
*/

ALTER TABLE games ALTER COLUMN admin_id SET DEFAULT auth.uid();
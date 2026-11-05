-- Run only after inspecting current production schema and storage capacity.
-- Never copy these private snapshots into a public repository or release ZIP.
BEGIN;
CREATE SCHEMA IF NOT EXISTS wb_private_release_backup;
REVOKE ALL ON SCHEMA wb_private_release_backup FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS wb_private_release_backup.cloud_saves_before_212 AS TABLE public.game_cloud_saves;
REVOKE ALL ON wb_private_release_backup.cloud_saves_before_212 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS wb_private_release_backup.rankings_before_212 AS TABLE public.game_rankings_v196;
REVOKE ALL ON wb_private_release_backup.rankings_before_212 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS wb_private_release_backup.players_before_212 AS TABLE public.game_players;
REVOKE ALL ON wb_private_release_backup.players_before_212 FROM PUBLIC,anon,authenticated;
ALTER TABLE wb_private_release_backup.cloud_saves_before_212 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wb_private_release_backup.rankings_before_212 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wb_private_release_backup.players_before_212 ENABLE ROW LEVEL SECURITY;
COMMIT;
-- Export the existing Edge function/config separately before replacing it.
-- No UPDATE/DELETE of saves is required by the v2.12 migration.

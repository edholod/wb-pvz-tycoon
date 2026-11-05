-- Additive migration. Does not update, delete or reset game_cloud_saves.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_profile_ids_v212 (
 telegram_id bigint PRIMARY KEY REFERENCES public.game_cloud_saves(telegram_id),
 public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 verified_username text,
 verified_photo text
);
ALTER TABLE public.game_profile_ids_v212 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_profile_ids_v212 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.game_profile_ids_v212 TO service_role;
INSERT INTO public.game_profile_ids_v212(telegram_id)
 SELECT telegram_id FROM public.game_cloud_saves ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.game_json_v212(value text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN RETURN value::jsonb; EXCEPTION WHEN others THEN RETURN '{}'::jsonb; END $$;
REVOKE ALL ON FUNCTION public.game_json_v212(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.game_json_v212(text) TO service_role;
-- Only the Edge function's service role can execute. Field filtering happens in SQL.
CREATE OR REPLACE FUNCTION public.public_profiles_v212(p_query text DEFAULT '',p_public_id uuid DEFAULT NULL,p_after uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH snapshots AS (
 SELECT ids.public_id,ids.verified_username,ids.verified_photo,
 game_json_v212(g.payload->>'wbpvz-privacy-v147') pr,
 game_json_v212(g.payload->>'wbpvz-profile-v146') profile,
 game_json_v212(g.payload->>'wbpvz-demo-v18') main,
 game_json_v212(g.payload->>'wbpvz-portfolio-v134') network
 FROM game_profile_ids_v212 ids JOIN game_cloud_saves g USING(telegram_id)
 WHERE (p_public_id IS NULL OR ids.public_id=p_public_id) AND (p_after IS NULL OR ids.public_id>p_after)
), filtered AS (
 SELECT * FROM snapshots
 WHERE pr->>'profileMode' IN ('open','partial')
 AND (p_public_id IS NOT NULL OR (pr->>'searchable'='true' AND (
  (pr->>'name' IS DISTINCT FROM 'false' AND position(lower(left(p_query,70)) IN lower(profile->>'displayName'))>0)
  OR (pr->>'telegram'='true' AND position(lower(regexp_replace(left(p_query,70),'^@','')) IN lower(verified_username))>0)
 )))
 ORDER BY public_id LIMIT 21
), scored AS (
 SELECT *,COALESCE((SELECT max(CASE WHEN jsonb_typeof(x->'state'->'quest35'->'xp')='number' THEN least(1e12,greatest(0,(x->'state'->'quest35'->>'xp')::numeric)) END)
 FROM jsonb_array_elements(COALESCE(network->'branches','[]')) x), CASE WHEN jsonb_typeof(main->'quest35'->'xp')='number' THEN least(1e12,greatest(0,(main->'quest35'->>'xp')::numeric)) END,0) xp
 FROM filtered
), items AS (
 SELECT public_id,jsonb_strip_nulls(jsonb_build_object(
 'public_id',public_id,'display_name',CASE WHEN pr->>'name'='false' THEN 'Игрок' ELSE left(profile->>'displayName',70) END,
 'username',CASE WHEN pr->>'telegram'='true' THEN verified_username END,
 'photo_url',CASE WHEN pr->>'avatar'='true' THEN verified_photo END,
 'xp',CASE WHEN pr->>'xp'='true' OR pr->>'xp' IS NULL THEN xp END,
 'player_level',CASE WHEN pr->>'xp' IS DISTINCT FROM 'false' THEN least(1000000,1+floor((-237.5+sqrt(237.5*237.5+50*xp))/25)) END,
 'balance',CASE WHEN pr->>'balance'='true' THEN main->'balance' END,
 'pvz_count',CASE WHEN pr->>'branches' IS DISTINCT FROM 'false' THEN (SELECT count(*) FROM jsonb_array_elements(COALESCE(network->'branches',jsonb_build_array(jsonb_build_object('state',main)))) b WHERE b->'state'->>'opened'='true') END,
 'rating',CASE WHEN pr->>'ratings'='true' THEN main->'rating' END,
 'happiness',CASE WHEN pr->>'happiness'='true' THEN main->'work212'->'publicHappiness' END,
 'achievements',CASE WHEN pr->>'achievements'='true' THEN (SELECT count(*) FROM jsonb_object_keys(COALESCE(main->'quest35'->'achievements','{}'))) END
 )) body FROM scored
)
SELECT COALESCE(jsonb_agg(body ORDER BY public_id),'[]'::jsonb) FROM items;
$$;
REVOKE ALL ON FUNCTION public.public_profiles_v212(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_profiles_v212(text,uuid,uuid) TO service_role;
DO $$ BEGIN IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated'; END IF; END $$;
COMMIT;

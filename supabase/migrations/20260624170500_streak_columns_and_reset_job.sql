-- T3.6 — Streak DB persistence + background reset job.
-- Spec: FEATURES.md A3 (Daily Activity & Streaks). Logika streak-a živi u lib/streak.ts.
--
-- Odluka (TASKS.md T3.6): streak MATEMATIKA ostaje u lib/streak.ts; DB samo SKLADIŠTI
-- stanje, a pg_cron sweep NULIRA pale streak-ove serverski (odblokira T3.9 "Streak Lost"
-- notifikaciju). SQL sweep je VERAN PORT JEDNE granice iz lib/streak.ts
-- (getStreakStatus → 'lost' kad je razmak ≥ 2 kalendarska dana), zakovan "pinning"
-- testom u lib/streak.test.ts da SQL i lib ne mogu tiho da se raziđu.
-- Advance (+1 / reset-na-slanje) se NAMERNO NE portuje u SQL — radi ga klijent preko
-- registerBlah() (anti-drift; ista odluka kao "skor formula ne ide u SQL", T3.3).
--
-- Aditivno: sve 3 kolone su bez-rizika po postojeće redove (rollback = DROP COLUMN +
-- cron.unschedule('reset-lapsed-streaks') + DROP FUNCTION).

-- 1) Storage kolone na profiles -----------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS streak_day integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_blah_at timestamptz,
    ADD COLUMN IF NOT EXISTS streak_tz_offset integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.streak_day IS
    'Tekuća dužina streak-a u danima (lib/streak.ts StreakState.day). 0 = nema streak-a.';
COMMENT ON COLUMN public.profiles.last_blah_at IS
    'Vreme poslednjeg poslatog Blah-a (StreakState.lastBlahAt). NULL = nikad.';
COMMENT ON COLUMN public.profiles.streak_tz_offset IS
    'Minuti koje treba dodati UTC-u za lokalno vreme korisnika (CET=+60); ulaz u '
    'kalendarski obračun streak-a. Klijent ga postavlja pri slanju Blah-a.';

-- 2) Sweep funkcija: nuliraj streak kad je protekao ceo kalendarski dan bez Blah-a -
--    day(t) = floor((epoch_sekunde(t) + tz*60) / 86400)        ← mirror lib dayKey()
--    'lost' kad je  nowDay - lastDay >= 2                       ← mirror getStreakStatus()
--    Single-statement UPDATE → atomski/concurrency-safe (row lock po redu).
CREATE OR REPLACE FUNCTION public.reset_lapsed_streaks()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
    WITH updated AS (
        UPDATE public.profiles
        SET streak_day = 0
        WHERE streak_day > 0
          AND last_blah_at IS NOT NULL
          AND floor((extract(epoch FROM now())       + streak_tz_offset * 60) / 86400)
            - floor((extract(epoch FROM last_blah_at) + streak_tz_offset * 60) / 86400) >= 2
        RETURNING 1
    )
    SELECT count(*)::integer FROM updated;
$func$;

COMMENT ON FUNCTION public.reset_lapsed_streaks() IS
    'T3.6 sweep: nulira pale streak-ove (≥2 kalendarska dana bez Blah-a, tz-aware). '
    'Veran port granice iz lib/streak.ts (zakovan pinning testom). Zakazan pg_cron-om.';

-- 3) pg_cron raspored — sweep svakog sata --------------------------------------
--    NB: ako "CREATE EXTENSION pg_cron" padne preko pooler-a (rola bez privilegije),
--    pokrenuti korake 3 iz Supabase Dashboard SQL editora (radi kao superuser).
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'reset-lapsed-streaks',
    '0 * * * *',
    $cron$SELECT public.reset_lapsed_streaks();$cron$
);

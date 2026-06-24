-- T3.3 — Blah Score: storage kolone na profiles.
-- Spec: FEATURES.md A2 (Blah Score = (Blahs Sent × 4) + (Followers × 0.8) + Streak Bonus).
--
-- Obim (svesno uzak — vidi TASKS.md T3.3 / odluku):
--   * blah_score  — keširan/prikazani skor (crveni Blahs stat, MyProfile 8.9).
--   * blahs_sent  — denormalizovan brojač poslatih Blah-ova (ulaz u formulu;
--                   T3.4 ga inkrementira pri slanju Blah-a).
-- NAMERNO NIJE ovde:
--   * followers — računa se COUNT(*) iz `follows` u trenutku obračuna (bez drift-a).
--   * streak_day / streak DB — pripada T3.5 / T3.6.
--   * SQL funkcija za skor — formula živi u `lib/blahScore.ts` (pravilo: logika u lib/),
--     SQL replika bi rizikovala drift. DB samo SKLADIŠTI skor; T3.4 ga računa i upisuje.
--
-- Aditivno i nepovratno-trivijalno: obe kolone NOT NULL DEFAULT 0
-- (postojeći redovi dobijaju 0; rollback = DROP COLUMN).

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS blah_score integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS blahs_sent integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.blah_score IS
    'Keširan Blah Score (FEATURES.md A2). Računa lib/blahScore.ts, upisuje app (T3.4).';
COMMENT ON COLUMN public.profiles.blahs_sent IS
    'Denormalizovan brojač poslatih Blah-ova; ulaz u Blah Score formulu.';

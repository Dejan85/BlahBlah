-- T3.20 — Blah+ premium pretplata: izvor istine za gating (FEATURES.md E, Camera 4.6).
-- Logika gejtovanja živi u lib/premium.ts; DB samo SKLADIŠTI trenutak isteka pretplate
-- (kao blah_score / streak / opened_at kolone — jedno polje, app izvodi „aktivan?").
--
-- KOLONA profiles.premium_until (timestamptz, nullable):
--   null → nije premium (ili isteklo); vrednost u BUDUĆNOSTI → aktivan Blah+.
--   Mapira na RevenueCat entitlement.expirationDate kad naplata proradi (T3.20 = stub,
--   services/premiumStatus.ts). Aditivno (rollback = DROP COLUMN). Stanje se izvodi u
--   lib/premium.ts (isPremiumActive) — DB ne duplira pravilo, samo čuva timestamp.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

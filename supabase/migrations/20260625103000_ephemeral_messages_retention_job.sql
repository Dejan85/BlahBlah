-- T3.13 — Ephemeral chat: retencija + auto-brisanje poruka (DB + pg_cron job).
-- Spec: FEATURES.md G1 (24h default / 30d "Save chat"). Logika živi u lib/ephemeral.ts.
--
-- Odluka (TASKS.md T3.13):
--  • RETENCIJA je svojstvo konverzacije → nova kolona conversations.saved
--    (false = 24h EPHEMERAL_DEFAULT_MS, true = 30d EPHEMERAL_SAVED_MS). Toggle UI = T3.14.
--  • Brisanje je SOFT-DELETE (is_deleted=true + text=NULL + brisanje reakcija), NE hard
--    DELETE reda. Razlozi: (a) čuva rekonstrukciju Chat Hours iz poruka — T3.11 foldira
--    registerMessage preko SVIH poruka, pa bi hard delete srušio "83h" brojač; (b) daje
--    red za "Deleted message…" placeholder (T3.14); (c) izbegava FK problem
--    messages.reply_to → messages (NO ACTION) kad noviji neistekli odgovor pokazuje na
--    isteklu poruku.
--  • CONCURRENCY ("da se ne obrišu sačuvani"): cutoff se računa PO konverzaciji iz njenog
--    aktuelnog `saved` u ISTOM MVCC snapshot-u kao i brisanje → single-statement CTE. Ako
--    korisnik toggluje "Save chat" tokom sweep-a, vidi se dosledan snapshot (sačuvana
--    konverzacija se ne dira). Idempotentno: `is_deleted = false` guard preskače već obrisane.
--  • ANTI-DRIFT (kao T3.6): SQL interval '24 hours' / '30 days' je VERAN PORT lib konstanti
--    EPHEMERAL_DEFAULT_MS / EPHEMERAL_SAVED_MS i predikata expiryCutoff (created_at <= cutoff),
--    zakovan pinning testom u lib/ephemeral.test.ts.
--
-- Aditivno/rollback: DROP COLUMN conversations.saved
--   + SELECT cron.unschedule('delete-expired-messages')
--   + DROP FUNCTION public.delete_expired_messages().

-- 1) Retencioni toggle na konverzaciji ----------------------------------------
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.conversations.saved IS
    'Ephemeral "Save chat" toggle (FEATURES.md G1): false = 24h retencija (default), '
    'true = 30 dana. Ulaz u public.delete_expired_messages() cutoff. UI = T3.14.';

-- 2) Sweep funkcija: soft-delete isteklih poruka ------------------------------
--    expired  ⇔  created_at <= now() - retencija(saved)      ← mirror lib/ephemeral expiryCutoff
--    Single-statement CTE (jedan MVCC snapshot) → atomski / concurrency-safe.
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
    WITH expired AS (
        SELECT m.id
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.is_deleted = false
          AND m.created_at <= now() - CASE WHEN c.saved
                                           THEN interval '30 days'
                                           ELSE interval '24 hours'
                                      END
    ),
    drop_reactions AS (
        DELETE FROM public.message_reactions
        WHERE message_id IN (SELECT id FROM expired)
        RETURNING 1
    ),
    soft_deleted AS (
        UPDATE public.messages
        SET is_deleted = true,
            text = NULL
        WHERE id IN (SELECT id FROM expired)
        RETURNING 1
    )
    SELECT count(*)::integer FROM soft_deleted;
$func$;

COMMENT ON FUNCTION public.delete_expired_messages() IS
    'T3.13 sweep: soft-delete (is_deleted=true, text=NULL, brisanje reakcija) poruka starijih '
    'od retencije konverzacije (24h default / 30d saved). Veran port lib/ephemeral.expiryCutoff '
    '(zakovan pinning testom). Zakazan pg_cron-om.';

-- 3) pg_cron raspored — sweep svakog sata (u :05, da se ne sudara sa T3.6 :00) --
--    pg_cron je već enable-ovan u T3.6; CREATE EXTENSION IF NOT EXISTS je no-op safety.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'delete-expired-messages',
    '5 * * * *',
    $cron$SELECT public.delete_expired_messages();$cron$
);

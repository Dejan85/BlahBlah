-- T3.15 — "Tap to View" (pogledaj-jednom) media: "Opened" stanje (Chat 5.4).
-- Spec: FEATURES.md G2, SCREENS.md Chat 5.1/5.4. Logika živi u lib/tapToView.ts;
-- DB samo skladišti trenutak otvaranja (jedno polje, kao blah_score/streak kolone).
--
-- (1) KOLONA messages.opened_at (timestamptz, nullable):
--     null → "Tap to View" (još nije otvoreno), set → "Opened". Aditivno (rollback =
--     DROP COLUMN). Stanje se izvodi u lib/tapToView.ts (getTapToViewState) — DB ne
--     duplira pravilo, samo čuva timestamp.
--
-- (2) RLS UPDATE politika `update_conversation_messages`:
--     Do sada messages NIJE imao NIJEDNU UPDATE politiku (samo insert/select), a RLS
--     je enable-ovan → svaki klijentski UPDATE je bio TIHO odbijen. To je lomilo i
--     postojeći "Delete message" (handleDelete radi UPDATE is_deleted=true) i blokira
--     novo markiranje "opened". Politika dozvoljava UČESNICIMA konverzacije (pošiljalac
--     ILI primalac) da ažuriraju poruku — primalac upisuje opened_at, pošiljalac soft-
--     delete. Struktura preslikava postojeću select_own_messages (participant1/2 check).

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS opened_at timestamptz;

DROP POLICY IF EXISTS update_conversation_messages ON public.messages;

CREATE POLICY update_conversation_messages ON public.messages
  FOR UPDATE
  USING (
    (auth.uid() = sender_id)
    OR (auth.uid() IN (
      SELECT conversations.participant1_id
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      UNION
      SELECT conversations.participant2_id
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
    ))
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT conversations.participant1_id
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      UNION
      SELECT conversations.participant2_id
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
    )
  );

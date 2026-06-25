/**
 * lib/tapToView.ts — "Tap to View" (pogledaj-jednom) media stanje. (T3.15)
 *
 * Spec (FEATURES.md G2, SCREENS.md Chat 5.1/5.4): foto/video poruke u chatu su
 * "Tap to View" — primalac vidi prompt, tapne da pogleda JEDNOM, pa poruka pređe u
 * "Opened" stanje (sivo) i NE može se ponovo otvoriti (Snapchat-stil). Pošiljalac
 * vidi status dostave ("Delivered" → "Opened" kad primalac pogleda) i takođe ne
 * može ponovo da otvori svoju poslatu poruku.
 *
 * Stanje se izvodi iz JEDNOG polja: `messages.opened_at` (timestamptz | null):
 *   null  → još nije otvoreno  → 'tap-to-view'
 *   set   → otvoreno           → 'opened'
 *
 * Čista funkcija (ARCHITECTURE §2.5): bez React/Supabase/UI. Markiranje "opened"
 * (upis `opened_at`) je side-effect → živi u MessageContext, ne ovde.
 */

export type TapToViewState = 'tap-to-view' | 'opened';

/**
 * Tipovi poruka koji su "Tap to View" (pogledaj-jednom). Single source za anti-drift
 * (kao STREAK_BONUS_DAYS u streak.ts): kad se doda 'video' kao message_type, dopuni
 * SAMO ovde — ne raštrkavaj `=== 'image'` po UI-ju.
 */
export const TAP_TO_VIEW_TYPES = ['image'] as const;

export function isTapToViewType(
  messageType: string | null | undefined
): boolean {
  return (
    typeof messageType === 'string' &&
    (TAP_TO_VIEW_TYPES as readonly string[]).includes(messageType)
  );
}

/** Poruka je "otvorena" čim `opened_at` ima ne-praznu vrednost (bilo koji timestamp). */
export function isTapToViewOpened(
  openedAt: string | null | undefined
): boolean {
  return typeof openedAt === 'string' && openedAt.trim().length > 0;
}

export function getTapToViewState(
  openedAt: string | null | undefined
): TapToViewState {
  return isTapToViewOpened(openedAt) ? 'opened' : 'tap-to-view';
}

/**
 * Da li VIEWER sme da otvori poruku: samo primalac (ne pošiljalac) i samo dok nije
 * već otvorena. Pošiljalac nikad ne otvara (Snapchat: ne gledaš ponovo svoj snap) →
 * uvek `false` za njega.
 */
export function canOpenTapToView(params: {
  isSender: boolean;
  openedAt: string | null | undefined;
}): boolean {
  return !params.isSender && !isTapToViewOpened(params.openedAt);
}

/**
 * Labela u placeholder bubble-u, zavisi od uloge:
 *   primalac, nije otvoreno   → "Tap to View"
 *   pošiljalac, nije otvoreno → "Delivered"
 *   bilo ko, otvoreno         → "Opened"
 */
export function tapToViewLabel(
  state: TapToViewState,
  isSender: boolean
): string {
  if (state === 'opened') return 'Opened';
  return isSender ? 'Delivered' : 'Tap to View';
}

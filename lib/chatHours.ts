// Chat Hours — vidljiv brojač "živosti" konverzacije (FEATURES.md A5, SCREENS.md Chat 5.0).
// Čista funkcija (BEZ React/UI/Supabase) — vidi ARCHITECTURE.md §2.5.
//
// ── Model (Snapchat „snapstreak", ali brojano u SATIMA umesto danima) ─────────
// Spec (A5): „svaki chat ima 24h tajmer koji se resetuje sa svakom poslatom
// porukom; ako nema odgovora 24h → Chat Hours padaju na 0; OBOJE moraju slati
// bar jednom dnevno."
//
//  • Streak je ŽIV samo dok su OBA učesnika poslala bar jednu poruku u poslednja
//    24h. Vezujuća strana je ona koja je poslala NAJDAVNIJE → rok isteka =
//    min(poslednja-od-mene, poslednja-od-njih) + 24h. Ako bilo ko ćuti ≥24h,
//    streak pada (to je smisao „oboje moraju slati bar jednom dnevno").
//  • Dok je živ, Chat Hours = proteklo SATI od početka tekuće serije
//    (`startedAt`), ceo broj. Prikaz: „83h", „4783h" (SCREENS.md Chat 5.0/24).
//  • Kad padne (istekne), brojač je 0; nova poruka koja ponovo uspostavi
//    obostranu aktivnost u 24h prozoru pokreće NOVU seriju od 0.
//
// „Tajmer iz dve strane" je suština ⚡ ivičnih slučajeva: jedna strana koja
// spamuje NE drži streak — druga mora odgovoriti unutar 24h.

const HOUR_MS = 3_600_000; // 1h u milisekundama
const DAY_MS = 86_400_000; // 24h

/** Prozor: obe strane moraju poslati bar jednom u 24h, inače streak pada. */
export const CHAT_HOURS_WINDOW_MS = DAY_MS;
/** Poslednja 3h pre isteka → „at-risk" (peščani sat / urgency u UI). */
export const CHAT_HOURS_WARNING_MS = 3 * HOUR_MS;

/** Učesnik iz ugla prikazanog korisnika. */
export type ChatParty = 'me' | 'them';

/** Status Chat Hours serije u datom trenutku. */
export type ChatHoursStatus =
  | 'none' // serija još ne postoji (bar jedna strana nije poslala u 24h prozoru)
  | 'active' // živa serija, van zone upozorenja
  | 'at-risk' // živa, ali ističe za ≤3h (vezujuća strana mora poslati)
  | 'expired'; // proteklo ≥24h od poruke vezujuće strane → brojač pada na 0

export interface ChatHoursState {
  /** Epoch ms početka tekuće žive serije (null = nema žive serije). */
  startedAt: number | null;
  /** Epoch ms poslednje poruke koju je poslao prikazani korisnik (null = nikad). */
  lastFromMe: number | null;
  /** Epoch ms poslednje poruke koju je poslao sagovornik (null = nikad). */
  lastFromThem: number | null;
}

export const EMPTY_CHAT_HOURS: ChatHoursState = {
  startedAt: null,
  lastFromMe: null,
  lastFromThem: null,
};

/**
 * Rok isteka serije = min(poslednja-od-mene, poslednja-od-njih) + 24h.
 * `null` ako bilo koja strana još nije poslala poruku (serija ne može postojati
 * dok obe ne učestvuju).
 */
export function chatExpiresAt(state: ChatHoursState): number | null {
  const { lastFromMe, lastFromThem } = state;
  if (lastFromMe == null || lastFromThem == null) return null;
  return Math.min(lastFromMe, lastFromThem) + CHAT_HOURS_WINDOW_MS;
}

/** Status serije u trenutku `now` (bez slanja nove poruke). */
export function getChatHoursStatus(
  state: ChatHoursState,
  now: number,
): ChatHoursStatus {
  if (state.startedAt == null || !Number.isFinite(now)) return 'none';
  const expiresAt = chatExpiresAt(state);
  if (expiresAt == null) return 'none';
  if (now >= expiresAt) return 'expired';
  if (expiresAt - now <= CHAT_HOURS_WARNING_MS) return 'at-risk';
  return 'active';
}

/**
 * Vidljivi Chat Hours brojač (ceo broj sati) u trenutku `now`.
 * 0 ako serija ne postoji, istekla je, ili je `now` pre njenog početka.
 */
export function chatHours(state: ChatHoursState, now: number): number {
  if (state.startedAt == null || !Number.isFinite(now)) return 0;
  if (getChatHoursStatus(state, now) === 'expired') return 0;
  const elapsed = now - state.startedAt;
  if (elapsed <= 0) return 0; // pre početka / clock skew
  return Math.floor(elapsed / HOUR_MS);
}

/** Preostalo ms do isteka serije (0 ako je isteklo ili serija ne postoji). */
export function msUntilChatExpiry(state: ChatHoursState, now: number): number {
  if (!Number.isFinite(now)) return 0;
  const expiresAt = chatExpiresAt(state);
  if (expiresAt == null) return 0;
  return Math.max(0, expiresAt - now);
}

/**
 * Obračun stanja kad `sender` POŠALJE poruku u trenutku `now` („reset po poruci").
 *
 * Pravila:
 *  - osvežava poslednju poruku te strane (clock skew unazad se ignoriše: pamti se
 *    najkasniji timestamp te strane);
 *  - serija je živa ako je DRUGA strana poslala u poslednja 24h (obostranost);
 *  - prelaz „mrtvo → živo" pokreće NOVU seriju: `startedAt` = raniji od dva važeća
 *    sidra (= poruka druge strane, jer otud teče „živost");
 *  - dok ostaje živa, `startedAt` se ne pomera (brojač raste neprekidno).
 *
 * @returns NOVO stanje (ne mutira ulaz).
 */
export function registerMessage(
  state: ChatHoursState,
  sender: ChatParty,
  now: number,
): ChatHoursState {
  if (!Number.isFinite(now)) return state; // bezbedan guard

  const prevStatus = getChatHoursStatus(state, now);
  const wasAlive = prevStatus === 'active' || prevStatus === 'at-risk';

  // Osveži stranu pošiljaoca (ne idi unazad na skew).
  const prevSide = sender === 'me' ? state.lastFromMe : state.lastFromThem;
  const newSide = prevSide == null ? now : Math.max(prevSide, now);
  const lastFromMe = sender === 'me' ? newSide : state.lastFromMe;
  const lastFromThem = sender === 'them' ? newSide : state.lastFromThem;

  const next: ChatHoursState = { startedAt: state.startedAt, lastFromMe, lastFromThem };

  const expiresAt = chatExpiresAt(next);
  const nowAlive = expiresAt != null && now < expiresAt;

  if (!nowAlive) {
    // Druga strana ćuti ≥24h (ili još nije poslala) → nema žive serije.
    next.startedAt = null;
  } else if (!wasAlive || state.startedAt == null) {
    // Mrtvo/none → živo: nova serija počinje od ranijeg važećeg sidra.
    next.startedAt = Math.min(lastFromMe as number, lastFromThem as number);
  }
  // wasAlive && nowAlive → zadrži postojeći startedAt (brojač raste neprekidno).

  return next;
}

/** Format za listu chatova: ceo broj sati + „h" (npr. 83 → „83h"). */
export function formatChatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  return `${Math.floor(hours)}h`;
}

// Blah Streak — signature mehanika dnevne aktivnosti (FEATURES.md A2/A3, SCREENS.md Home 2.0).
// Čista funkcija (BEZ React/UI/Supabase) — vidi ARCHITECTURE.md §2.5.
//
// ── Model (spec meša DVA tajmera; ovde su razdvojena po nameni) ──────────────
//  1) BROJANJE / RESET streak-a → po KALENDARSKOM danu (timezone-aware).
//     Streak = broj UZASTOPNIH kalendarskih dana sa ≥1 poslatim Blah-om
//     ("Daily Activity & Streaks", A3). Reset kad protekne ceo dan bez Blah-a.
//     Razlog kalendara (a ne čistog rolling 24h): "prvi Blah u 24h se računa"
//     (A2) traži FIKSNU mrežu dana da se zna šta je „prvi danas"; rolling mreža
//     vezana za poslednji Blah je paradoksalna (advance i deadline dele isti
//     anchor). Kalendar je i razlog zašto task naglašava „granice dana/timezone".
//  2) BUNNY upozorenje → ROLLING „24h od poslednjeg POSLATOG Blah-a, aktivan
//     ≤3h" (Home 2.0 / Blahs dugme). Ovo je UI urgency, ne menja brojanje.
//  3) 26h recovery prozor (A4) → NIJE ovde, ide u lib/blahRecovery.ts (T3.7).
//
// Streak Bonus dani (8/20/28/48) žive ovde kao single source — blahScore.ts ih uvozi.

const DAY_MS = 86_400_000; // 24h u milisekundama
const MINUTE_MS = 60_000;

// Dani na kojima Blah Score dobija Streak Bonus (FEATURES.md A2: "× 2 na 8/20/28/48").
export const STREAK_BONUS_DAYS = [8, 20, 28, 48] as const;

/** Da li je dati streak dan bonus dan (8/20/28/48). Ne-konačni ulaz → false. */
export function isStreakBonusDay(day: number): boolean {
  if (!Number.isFinite(day)) return false;
  return STREAK_BONUS_DAYS.includes(day as (typeof STREAK_BONUS_DAYS)[number]);
}

/** Status streak-a u datom trenutku (bez slanja novog Blah-a). */
export type StreakStatus =
  | 'none' // korisnik još nema streak
  | 'active' // već poslao Blah danas → streak siguran za danas
  | 'at-risk' // nov kalendarski dan, danas još nema Blah → istekne ako dan prođe prazan
  | 'lost'; // protekao ceo dan bez Blah-a → streak pao

export interface StreakState {
  /** Tekuća dužina streak-a u danima (0 = nema streak-a). */
  day: number;
  /** Epoch ms poslednjeg poslatog Blah-a (null = nikad). */
  lastBlahAt: number | null;
}

export const EMPTY_STREAK: StreakState = { day: 0, lastBlahAt: null };

// Koji KALENDARSKI dan (ceo broj dana od epohe) pripada timestamp-u u datoj zoni.
// tzOffsetMinutes = minuti koje treba dodati UTC-u za lokalno vreme (CET = +60).
function dayKey(ms: number, tzOffsetMinutes: number): number {
  return Math.floor((ms + tzOffsetMinutes * MINUTE_MS) / DAY_MS);
}

/**
 * Obračun streak-a kad korisnik POŠALJE Blah u trenutku `now`.
 *
 * Pravila (po kalendarskom danu u zoni `tzOffsetMinutes`):
 *  - nema prethodnog streak-a            → dan 1
 *  - isti kalendarski dan kao poslednji  → bez promene (samo „prvi danas" se računa)
 *  - tačno sledeći kalendarski dan       → dan + 1 (uzastopno)
 *  - preskočen bar jedan ceo dan         → reset na dan 1 (ovaj Blah kreće iznova)
 *  - `now` pre poslednjeg Blah-a (skew)  → bez promene (ne ide unazad)
 *
 * @returns NOVO stanje (ne mutira ulaz).
 */
export function registerBlah(
  prev: StreakState,
  now: number,
  tzOffsetMinutes = 0,
): StreakState {
  if (!Number.isFinite(now)) return prev; // bezbedan guard — nevažeći timestamp

  const last = prev.lastBlahAt;
  if (last == null || prev.day <= 0) {
    return { day: 1, lastBlahAt: now };
  }

  const lastDay = dayKey(last, tzOffsetMinutes);
  const nowDay = dayKey(now, tzOffsetMinutes);

  if (nowDay < lastDay) {
    return prev; // clock skew / van redosleda — ne pomeramo unazad
  }
  if (nowDay === lastDay) {
    // isti dan: streak ostaje, ali pamtimo najkasniji Blah (za rolling deadline)
    return { day: prev.day, lastBlahAt: Math.max(last, now) };
  }
  if (nowDay === lastDay + 1) {
    return { day: prev.day + 1, lastBlahAt: now }; // uzastopni dan
  }
  return { day: 1, lastBlahAt: now }; // preskočen ceo dan → reset
}

/** Status streak-a u trenutku `now` (bez slanja Blah-a) — za prikaz / proveru reseta. */
export function getStreakStatus(
  state: StreakState,
  now: number,
  tzOffsetMinutes = 0,
): StreakStatus {
  if (state.lastBlahAt == null || state.day <= 0) return 'none';

  const lastDay = dayKey(state.lastBlahAt, tzOffsetMinutes);
  const nowDay = dayKey(now, tzOffsetMinutes);

  if (nowDay <= lastDay) return 'active'; // blah danas (ili budući skew) → siguran
  if (nowDay === lastDay + 1) return 'at-risk'; // nov dan, danas još nema Blah
  return 'lost'; // ≥1 ceo dan bez Blah-a
}

/**
 * Efektivni tekući streak dan u trenutku `now`: 0 ako je streak pao
 * ('lost'), inače sačuvana dužina. Ovo je vrednost koja ide u
 * `calculateBlahScore(..., streakDay)`.
 */
export function currentStreakDay(
  state: StreakState,
  now: number,
  tzOffsetMinutes = 0,
): number {
  return getStreakStatus(state, now, tzOffsetMinutes) === 'lost' ? 0 : state.day;
}

// ── Rolling deadline za Bunny upozorenje (Home 2.0 / Blahs) ──────────────────
export const STREAK_DEADLINE_MS = DAY_MS; // 24h od poslednjeg poslatog Blah-a
export const BUNNY_WARNING_MS = 3 * 60 * 60 * 1000; // poslednja 3h pre 24h

/** Preostalo ms do 24h od poslednjeg Blah-a (0 ako je isteklo ili nema Blah-a). */
export function msUntilDeadline(state: StreakState, now: number): number {
  if (state.lastBlahAt == null || !Number.isFinite(now)) return 0;
  return Math.max(0, state.lastBlahAt + STREAK_DEADLINE_MS - now);
}

/**
 * Da li je Bunny „aktivan" — preostalo ≤3h do 24h od poslednjeg poslatog Blah-a
 * (Home 2.0 / Blahs dugme). False ako je već isteklo ili nema poslatog Blah-a.
 */
export function isBunnyActive(state: StreakState, now: number): boolean {
  const remaining = msUntilDeadline(state, now);
  return remaining > 0 && remaining <= BUNNY_WARNING_MS;
}

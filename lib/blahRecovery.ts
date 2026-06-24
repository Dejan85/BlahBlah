// Blah Recovery — plaćeni „spas" izgubljenog streak-a (FEATURES.md A4, SCREENS.md MyProfile 8.8).
// Čista funkcija (BEZ React/UI/Supabase/plaćanja) — vidi ARCHITECTURE.md §2.5.
//
// ── Model (ROLLING, anchor = poslednji poslati Blah) ─────────────────────────
//  Streak ima 26h „grace" prozor od poslednjeg Blah-a. Kad protekne 26h bez novog
//  Blah-a → streak je IZGUBLJEN ("Blah Streak Lost", D6). Tada se otvara RECOVERY
//  ponuda koja traje još ~13h ("In 13h offer expire", MyProfile 8.8): korisnik plati
//  €1.99 jednokratno i streak se vraća — nov 26h ciklus kreće od trenutka recovery-ja.
//  Kad i tih 13h prođe → ponuda istekla, streak trajno pao.
//
//  Vremenska osa (sati od lastBlahAt):
//    0 ─────────────── 26h ─────────────── 39h ──────►
//    │      safe         │   recoverable     │  expired
//    │                   │  (ponuda 13h)     │
//    └ urgency bunny u poslednja 3h pre 26h (23h–26h)
//
//  ⚠️ Ovaj modul je ROLLING (anchor = lastBlahAt), namerno ODVOJEN od kalendarskog
//  brojanja u lib/streak.ts. streak.ts broji DANE (kalendar, timezone-aware);
//  blahRecovery meri PROZORE spasa (sati od poslednjeg Blah-a, tz-nezavisno — sati su
//  apsolutni). Zato recovery API ne uzima tzOffset. Sam tok plaćanja (RevenueCat) je T3.8.

const HOUR_MS = 60 * 60 * 1000;

/** 26h od poslednjeg Blah-a dok streak ne padne (A4 „26h prozor"). */
export const RECOVERY_GRACE_MS = 26 * HOUR_MS;
/** Recovery ponuda traje 13h posle pada streak-a (MyProfile 8.8 „In 13h offer expire"). */
export const RECOVERY_OFFER_MS = 13 * HOUR_MS;
/** Urgency bunny animacija u poslednja 3h pre pada streak-a (A4). */
export const RECOVERY_URGENCY_MS = 3 * HOUR_MS;
/** Jednokratna cena recovery-ja u EUR (MyProfile 8.8). */
export const RECOVERY_PRICE_EUR = 1.99;

export type RecoveryStatus =
  | 'safe' // unutar 26h — streak još nije pao
  | 'recoverable' // 26h–39h — streak pao, ali ponuda za spas je živa
  | 'expired'; // posle 39h (ili nema poslatog Blah-a) — ponuda istekla, streak trajno pao

/**
 * Epoch ms kada streak postaje IZGUBLJEN (26h od poslednjeg Blah-a).
 * `null` ako nema poslatog Blah-a (ili nevažeći ulaz) — nema šta da padne.
 */
export function streakLostAt(lastBlahAt: number | null): number | null {
  if (lastBlahAt == null || !Number.isFinite(lastBlahAt)) return null;
  return lastBlahAt + RECOVERY_GRACE_MS;
}

/**
 * Epoch ms kada recovery ponuda ISTIČE (26h + 13h od poslednjeg Blah-a).
 * `null` ako nema poslatog Blah-a (ili nevažeći ulaz).
 */
export function recoveryOfferExpiresAt(
  lastBlahAt: number | null
): number | null {
  const lost = streakLostAt(lastBlahAt);
  return lost == null ? null : lost + RECOVERY_OFFER_MS;
}

/**
 * Status recovery-ja u trenutku `now` (vidi `RecoveryStatus`).
 * Granice: tačno na 26h → već `recoverable` (ponuda otvorena); tačno na 39h → `expired`.
 * Pretpostavlja da je streak postojao — postojanje streak-a (day > 0) proverava pozivalac.
 */
export function getRecoveryStatus(
  lastBlahAt: number | null,
  now: number
): RecoveryStatus {
  const lost = streakLostAt(lastBlahAt);
  if (lost == null || !Number.isFinite(now)) return 'expired';
  if (now < lost) return 'safe';
  if (now < lost + RECOVERY_OFFER_MS) return 'recoverable';
  return 'expired';
}

/** Da li je recovery ponuda trenutno ŽIVA (streak pao, ali u 13h prozoru spasa). */
export function isRecoveryAvailable(
  lastBlahAt: number | null,
  now: number
): boolean {
  return getRecoveryStatus(lastBlahAt, now) === 'recoverable';
}

/**
 * Preostalo ms do GUBITKA streak-a (26h countdown pre pada). 0 ako je već prošlo
 * ili nema poslatog Blah-a. Za countdown dok je status još `safe`.
 */
export function msUntilStreakLost(
  lastBlahAt: number | null,
  now: number
): number {
  const lost = streakLostAt(lastBlahAt);
  if (lost == null || !Number.isFinite(now)) return 0;
  return Math.max(0, lost - now);
}

/**
 * Preostalo ms do isteka recovery ponude ("In 13h offer expire" countdown). 0 ako je
 * ponuda istekla ili nema Blah-a. Smisleno tek dok je status `recoverable`
 * (dok je `safe`, vrednost uključuje i preostali 26h grace, pa je veća od 13h).
 */
export function msUntilOfferExpires(
  lastBlahAt: number | null,
  now: number
): number {
  const expires = recoveryOfferExpiresAt(lastBlahAt);
  if (expires == null || !Number.isFinite(now)) return 0;
  return Math.max(0, expires - now);
}

/**
 * Da li je „urgency bunny" aktivan — poslednja 3h pre gubitka streak-a (23h–26h od
 * poslednjeg Blah-a). False ako je streak već pao (remaining = 0) ili nema Blah-a.
 *
 * ⚠️ Razlikuje se od `isBunnyActive` (lib/streak.ts): ono je vezano za 24h rolling
 * deadline (Home 2.0 / Blahs dugme), ovo za 26h recovery grace (A4 urgency animacija).
 */
export function isRecoveryUrgent(
  lastBlahAt: number | null,
  now: number
): boolean {
  const remaining = msUntilStreakLost(lastBlahAt, now);
  return remaining > 0 && remaining <= RECOVERY_URGENCY_MS;
}

/** Stanje streak-a posle uspešnog recovery plaćanja (ulaz za upis u `profiles`). */
export interface RecoveryResult {
  /** Streak dan koji se VRAĆA — recovery spasava od pada na 0. */
  streakDay: number;
  /** Nov anchor (epoch ms) — od ovog trenutka kreće nov 26h grace ciklus. */
  lastBlahAt: number;
}

/**
 * Stanje streak-a POSLE uspešnog recovery plaćanja (MyProfile 8.8, T3.8).
 * Spec: "Your Blah Score doesn't go to 0" — streak se NE resetuje; vraća se na
 * `restoredDay` (dužina koju je imao pre pada) i kreće NOV 26h ciklus od `now`
 * ("nakon plaćanja kreće nov 26h ciklus", A4).
 *
 * `restoredDay` = `streak_day` pre pada; pozivalac ga čuva u memoriji pre nego što
 * on-read/cron reset upiše 0 (zato recovery ne čita iz već-nuliranog DB-a). Rezultat
 * je uvek ≥1 (recovery podrazumeva da je streak postojao). Čista funkcija — ne baca:
 * nevažeći ulaz → bezbedan default (dan 1 / anchor 0).
 */
export function applyRecovery(
  restoredDay: number,
  now: number
): RecoveryResult {
  const streakDay = Number.isFinite(restoredDay)
    ? Math.max(1, Math.floor(restoredDay))
    : 1;
  const lastBlahAt = Number.isFinite(now) ? now : 0;
  return { streakDay, lastBlahAt };
}

/**
 * Da li treba KREIRATI „Blah Streak Lost" notifikaciju (D6, FEATURES.md tabela D / T3.9).
 * Čista odluka — pozivalac radi I/O (upit postojećih notifikacija + insert).
 *
 * Notifikacija se šalje JEDNOM po događaju gubitka: okida se kad streak padne i ponuda
 * je još živa (`recoverable`), a dedup ide preko `lastNotifiedAt` = vreme (epoch ms)
 * poslednje već-poslate streak-lost notifikacije (npr. `created_at` zadnjeg takvog reda).
 * Pošto svaki NOV gubitak ima kasniji `streakLostAt` (novi anchor → +26h), poređenje
 * `lastNotifiedAt >= streakLostAt` pouzdano hvata „već javljeno za OVAJ pad" i sprečava
 * ponovno slanje na svako otvaranje profila.
 *
 * @param recoveryStatus  trenutni status (vidi `getRecoveryStatus`)
 * @param streakDay       streak dan PRE pada (>0 = postojao je streak vredan gubitka)
 * @param lostAt          epoch ms ovog gubitka (`streakLostAt(lastBlahAt)`)
 * @param lastNotifiedAt  epoch ms poslednje poslate streak-lost notif., ili `null` ako je nema
 */
export function shouldNotifyStreakLost(params: {
  recoveryStatus: RecoveryStatus;
  streakDay: number;
  lostAt: number | null;
  lastNotifiedAt: number | null;
}): boolean {
  const { recoveryStatus, streakDay, lostAt, lastNotifiedAt } = params;
  // Javljamo samo kad je streak upravo pao a ponuda za spas je još živa.
  if (recoveryStatus !== 'recoverable') return false;
  // Mora postojati streak koji se izgubio.
  if (!Number.isFinite(streakDay) || streakDay <= 0) return false;
  if (lostAt == null || !Number.isFinite(lostAt)) return false;
  // Dedup: već javljeno za ovaj (ili noviji) pad → ne ponavljaj.
  if (
    lastNotifiedAt != null &&
    Number.isFinite(lastNotifiedAt) &&
    lastNotifiedAt >= lostAt
  ) {
    return false;
  }
  return true;
}

/**
 * Tekst odbrojavanja za recovery popup ("In 13h offer expire", MyProfile 8.8).
 * `ms` = preostalo do isteka ponude (`msUntilOfferExpires`). ≤0 ili nevažeće → "Offer expired".
 * Format: sati+minuti dok ima sati ("In 12h 30m offer expire"), inače samo minuti.
 */
export function formatRecoveryCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Offer expired';
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) {
    return `In ${hours}h${minutes > 0 ? ` ${minutes}m` : ''} offer expire`;
  }
  return `In ${minutes}m offer expire`;
}

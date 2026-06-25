// Blah+ premium gating — provera pretplate + koje pogodnosti otključava
// (FEATURES.md E, SCREENS.md Camera 4.6 / MyProfile 8.6–8.7). Čista funkcija
// (BEZ React/UI/Supabase/plaćanja) — vidi ARCHITECTURE.md §2.5.
//
// ── Model ────────────────────────────────────────────────────────────────────
//  Premium je VREMENSKI ograničena pretplata. Jedini izvor istine je trenutak do
//  kog važi (`premiumUntil`, epoch ms; mapira na RevenueCat
//  entitlement.expirationDate). Aktivan = premiumUntil u budućnosti.
//
//  Pogodnosti (who-viewed, score boost, lock posts, no ads, customization) su za
//  sada SVE iza istog gate-a (aktivan premium); enum + `canAccessPremiumFeature`
//  daju JEDINSTVENU tačku gejtovanja koju buduće taskove (T3.21–T3.24) samo
//  pozivaju umesto da svaka razbacuje svoju proveru.
//
//  Plaćanje (RevenueCat) je side-effect → NE ovde; IO granica je
//  services/premiumStatus.ts (stub, kao services/recoveryPurchase.ts T3.8).
//  Ovde žive samo čista pravila i aritmetika datuma.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mesečna pretplata (Camera 4.6 / FEATURES E). */
export const PREMIUM_PRICE_MONTHLY_EUR = 4.99;
/** Godišnja pretplata — 50% off, default selektovano (Camera 4.6). */
export const PREMIUM_PRICE_YEARLY_EUR = 29.94;

/** Trajanje pretplate po planu (dani) — ulaz za izračun `premiumUntil` posle kupovine. */
export const PREMIUM_PLAN_DAYS = { monthly: 30, yearly: 365 } as const;

/** +10% množilac na Blah Score za premium (FEATURES E „Score Boost"; primenjuje T3.22). */
export const SCORE_BOOST_MULTIPLIER = 1.1;

export type PremiumPlan = 'monthly' | 'yearly';

/** Pogodnosti iza Blah+ paywall-a (Camera 4.6). Single source za gejtovanje. */
export const PREMIUM_FEATURES = [
  'who_viewed', // See Who Viewed Your Profile (T3.21)
  'score_boost', // Blah Score Boost +10% (T3.22)
  'lock_posts', // Lock 3+ Posts Forever (T3.23)
  'no_ads', // Ad-free (T3.24)
  'customization', // Exclusive Customization (coming soon)
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

/** Stanje pretplate (izvor istine = trenutak isteka). `null` = nikad/isteklo. */
export interface PremiumStatus {
  /** Epoch ms do kog premium važi; `null` = nije premium. */
  premiumUntil: number | null;
}

/**
 * Da li je premium AKTIVAN u trenutku `now` (premiumUntil strogo u budućnosti).
 * Fail-safe (§2.5): nevažeći `premiumUntil`/`now` → false (nikad lažno premium).
 */
export function isPremiumActive(status: PremiumStatus, now: number): boolean {
  const until = status?.premiumUntil;
  if (until == null || !Number.isFinite(until) || !Number.isFinite(now)) {
    return false;
  }
  return until > now;
}

/**
 * Da li korisnik sme da koristi premium pogodnost `feature` u trenutku `now`.
 * Za sada su SVE pogodnosti iza istog gate-a (aktivan premium); `feature` parametar
 * je tu da buduća selektivna pravila imaju jednu tačku, i da nepoznata pogodnost
 * (greška u pozivu) nikad ne prođe kao dozvoljena.
 */
export function canAccessPremiumFeature(
  feature: PremiumFeature,
  status: PremiumStatus,
  now: number
): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return false;
  return isPremiumActive(status, now);
}

/** Preostalo ms do isteka premiuma. 0 ako nije aktivan / nevažeće. */
export function premiumExpiresInMs(status: PremiumStatus, now: number): number {
  if (!isPremiumActive(status, now)) return 0;
  return Math.max(0, (status.premiumUntil as number) - now);
}

/**
 * Novi `premiumUntil` POSLE uspešne kupovine plana (ulaz za upis u `profiles`).
 * Ako je pretplata još AKTIVNA, nadovezuje se (produžava od postojećeg isteka);
 * inače kreće od `now`. Čista — ne baca: nevažeći `now` → baza 0 + trajanje plana.
 */
export function premiumUntilAfterPurchase(
  plan: PremiumPlan,
  now: number,
  currentStatus?: PremiumStatus
): number {
  const days = PREMIUM_PLAN_DAYS[plan] ?? PREMIUM_PLAN_DAYS.monthly;
  let base: number;
  if (currentStatus && isPremiumActive(currentStatus, now)) {
    base = currentStatus.premiumUntil as number;
  } else {
    base = Number.isFinite(now) ? now : 0;
  }
  return base + days * DAY_MS;
}

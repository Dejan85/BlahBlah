// Blah Score — signature mehanika skorovanja korisnika.
// Čista funkcija (BEZ React/UI/Supabase) — vidi ARCHITECTURE.md §2.5.
// Spec: FEATURES.md A2.
//
// Formula: Blah Score = (Blahs Sent × 4) + (Followers × 0.8) + Streak Bonus
//   - Streak Bonus = Blahs Sent × 2, ali SAMO na streak danima (8 / 20 / 28 / 48).
//   - Rezultat se zaokružuje na ceo broj (256.8 → 257).

// Dani na kojima se aktivira Streak Bonus (FEATURES.md A2: "× 2 na danima 8 / 20 / 28 / 48").
const STREAK_DAYS = [8, 20, 28, 48] as const;

/**
 * Računa Blah Score korisnika.
 *
 * Primer (FEATURES.md A2): 10 blahs, 10 followers, 8. dan →
 *   40 (10×4) + 8 (10×0.8) + 20 (streak bonus 10×2) = 68.
 *
 * @param blahsSent broj poslatih Blah-ova
 * @param followers broj pratilaca
 * @param streakDay tekući dan streak-a (bonus se aktivira na 8/20/28/48)
 * @returns skor zaokružen na ceo broj (ne-konačni ulazi se tretiraju kao 0)
 */
export function calculateBlahScore(
  blahsSent: number,
  followers: number,
  streakDay: number,
): number {
  const blahs = safe(blahsSent);
  const fols = safe(followers);
  const day = safe(streakDay);

  const base = blahs * 4 + fols * 0.8;
  const isStreakDay = STREAK_DAYS.includes(day as (typeof STREAK_DAYS)[number]);
  const bonus = isStreakDay ? blahs * 2 : 0;

  return Math.round(base + bonus);
}

// Ne-konačne vrednosti (NaN/Infinity) → 0, da skor nikad ne ispadne NaN.
function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

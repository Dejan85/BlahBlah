// Formatiranje velikih brojeva za prikaz: 10000 → "10k", 10100 → "10.1k".
// Čista funkcija (BEZ React/UI/Supabase) — vidi ARCHITECTURE.md §2.5.
// Spec: FEATURES.md A2 (Blah Score prikaz) — "10.000 → '10k', '10.1k'...".
//
// Konvencija sufiksa (kao Instagram/Twitter): k (hiljade), M (milioni), B (milijarde).
// Mantisa se zaokružuje na 1 decimalu; suvišna ".0" se skida (10.0k → 10k).

const TIERS = [
  { value: 1_000, suffix: 'k' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000_000_000, suffix: 'B' },
] as const;

/**
 * Formatira broj u kompaktan prikaz sa sufiksom.
 *
 * Primeri: 999 → "999", 1000 → "1k", 1500 → "1.5k", 10000 → "10k",
 * 10100 → "10.1k", 1_200_000 → "1.2M". Negativni brojevi zadržavaju znak.
 *
 * @param count broj za formatiranje (ne-konačne vrednosti → "0")
 */
export function formatCount(count: number): string {
  if (!Number.isFinite(count)) return '0';

  const sign = count < 0 ? '-' : '';
  const abs = Math.abs(count);

  // Ispod 1000 → ceo broj bez sufiksa (256.8 → "257").
  if (abs < 1000) return sign + String(Math.round(abs));

  // Izaberi najveći tier po veličini broja (npr. 950_000 ostaje u "k" → "950k").
  let i = 0;
  while (i + 1 < TIERS.length && abs >= TIERS[i + 1].value) i++;

  let mantissa = round1(abs / TIERS[i].value);

  // Rollover: 999_999/1000 = 999.999 → zaokruženo "1000k" → promoviši u "1M".
  if (mantissa >= 1000 && i + 1 < TIERS.length) {
    i++;
    mantissa = round1(abs / TIERS[i].value);
  }

  const formatted = mantissa.toFixed(1).replace(/\.0$/, '');
  return sign + formatted + TIERS[i].suffix;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

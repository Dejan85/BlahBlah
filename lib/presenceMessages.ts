// Presence „vanished" poruke — randomizovane smešne poruke po vremenskim zonama
// (FEATURES.md B2, Figma 2. slika). Čista funkcija (BEZ React/UI/Supabase) — v. ARCHITECTURE.md §2.5.
//
// ── Model ─────────────────────────────────────────────────────────────────────
// Umesto suvog „gone exploring 5m ago", spec traži nasumičnu poruku iz preset
// liste, biranu po OPSEGU vremena od poslednje aktivnosti:
//   0–10min · 10min–1h · 1–5h · 5–12h · 12–24h · 1–3 dana · (>3 dana = fallback)
// Pravila iz spec-a:
//   • Nasumičan izbor iz liste te zone (rng se UBRIZGAVA → deterministički test).
//   • Poruka se menja svaki put kad korisnik napusti/vrati se (caller prosledi nov
//     `random`, npr. Math.random()).
//   • Automatski prelaz u sledeću zonu kako vreme protiče.
//   • Zaokruživanje vremena je FLOOR (odsecanje), ne matematičko: 10h35m → „10h",
//     tek 11h01m → „11h" (spec primer).

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Vremenske zone „odsutnosti" (od najsvežije do najstarije). */
export type PresenceZone =
  | 'just-now' // 0–10 min
  | 'minutes' // 10 min – 1h
  | 'hours-early' // 1–5h
  | 'hours-mid' // 5–12h
  | 'hours-late' // 12–24h
  | 'days' // 1–3 dana
  | 'long-gone'; // > 3 dana (fallback van spec opsega)

/** Gornje granice zona (ekskluzivno) — tačno na granici se ulazi u sledeću zonu. */
const ZONE_UPPER_BOUNDS: readonly { zone: PresenceZone; maxMs: number }[] = [
  { zone: 'just-now', maxMs: 10 * MINUTE_MS },
  { zone: 'minutes', maxMs: HOUR_MS },
  { zone: 'hours-early', maxMs: 5 * HOUR_MS },
  { zone: 'hours-mid', maxMs: 12 * HOUR_MS },
  { zone: 'hours-late', maxMs: DAY_MS },
  { zone: 'days', maxMs: 3 * DAY_MS },
];

/** Preset poruke po zoni (Figma spec: smešne „vanished" poruke). */
export const PRESENCE_MESSAGES: Record<PresenceZone, readonly string[]> = {
  'just-now': [
    'Poof! They just disappeared',
    'Gone in a blink',
    'Here a second ago…',
    'Vanished into thin air',
  ],
  minutes: [
    'Gone exploring',
    'Off chasing squirrels',
    'Stepped out for a bit',
    'Brb, probably',
  ],
  'hours-early': [
    'Out living their best life',
    'Touching grass apparently',
    'Lost in the sauce',
    'Busy being mysterious',
  ],
  'hours-mid': [
    'Gone faster than my paycheck',
    'Off the grid',
    'In witness protection (jk)',
    'Ghosting the timeline',
  ],
  'hours-late': [
    'Probably sleeping',
    'Hibernating',
    'Recharging social batteries',
    'On airplane mode with life',
  ],
  days: [
    'Gone on a soul-searching trip',
    'Living off the grid for real',
    'Missing in action',
    'Last seen riding into the sunset',
  ],
  'long-gone': [
    'Long gone',
    'Vanished into legend',
    'A distant memory',
    'Off the map entirely',
  ],
};

/** Zona kojoj pripada protekло vreme od poslednje aktivnosti. */
export function getPresenceZone(elapsedMs: number): PresenceZone {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 'just-now';
  for (const { zone, maxMs } of ZONE_UPPER_BOUNDS) {
    if (elapsedMs < maxMs) return zone;
  }
  return 'long-gone';
}

/**
 * Nasumična poruka iz date zone. `random` je vrednost u [0,1) (npr. Math.random()).
 * Nevažeći `random` (NaN/<0/≥1) se klampuje u opseg liste → uvek vrati validnu poruku.
 */
export function pickPresenceMessage(zone: PresenceZone, random: number): string {
  const list = PRESENCE_MESSAGES[zone];
  const r = Number.isFinite(random) ? Math.min(0.999_999, Math.max(0, random)) : 0;
  const index = Math.floor(r * list.length);
  return list[index] ?? list[0];
}

/**
 * Spojeno: zona iz proteklog vremena + nasumična poruka te zone.
 * Caller prosledi nov `random` pri svakom prikazu (poruka se menja na povratak).
 */
export function presenceMessage(elapsedMs: number, random: number): string {
  return pickPresenceMessage(getPresenceZone(elapsedMs), random);
}

/**
 * Zaokružena ("floor"-ована) labela proteklog vremena za prikaz: „7m" / „10h" / „2d".
 * Po spec-u odsecanje, ne matematičko zaokruživanje (10h35m → „10h", 11h01m → „11h").
 * <1min → „now".
 */
export function roundedPresenceLabel(elapsedMs: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < MINUTE_MS) return 'now';
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}m`;
  if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)}h`;
  return `${Math.floor(elapsedMs / DAY_MS)}d`;
}

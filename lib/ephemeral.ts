// Ephemeral chat — retencija poruka (FEATURES.md G1, SCREENS.md Chat 5.8/24).
// Čista funkcija (BEZ React/UI/Supabase) — vidi ARCHITECTURE.md §2.5.
//
// ── Model ─────────────────────────────────────────────────────────────────────
// Spec (G1): poruke/konverzacija su ephemeral — brišu se posle 24h po DEFAULTU;
// per-contact toggle „Save chat" (Chat 5.8) produžava retenciju na 30 DANA.
//
//  • Retencioni prozor je svojstvo konverzacije (toggle `saved`), ne pojedinačne
//    poruke: `saved=false` → 24h, `saved=true` → 30 dana.
//  • Rok isteka poruke = `createdAt + retentionMs(saved)`. Poruka je „expired"
//    (kandidat za brisanje / placeholder) kad `now >= expiresAt`.
//  • Toggle se primenjuje NA TRENUTNO stanje (rok se rekalkuliše iz aktuelnog
//    `saved`): uključivanje „Save chat" produžava prozor svim još neobrisanim
//    porukama (30d od njihovog `createdAt`); isključivanje skraćuje na 24h, pa
//    poruke starije od 24h postaju odmah expired. ⚡ Ivični slučaj: poruka koju
//    je background job VEĆ obrisao se ne može vratiti uključivanjem toggle-a —
//    to je concurrency briga T3.13 (job ne sme dirati `saved` konverzacije).
//
// Granica brisanja je usaglašena na dva načina koja MORAJU dati isti rezultat:
//   (1) per-poruka:  `isMessageExpired(createdAt, saved, now)`  (UI / placeholder)
//   (2) batch (job): `createdAt <= expiryCutoff(saved, now)`    (T3.13 SQL sweep)
// Ekvivalencija je zakovana pinning testom u `ephemeral.test.ts`.

const DAY_MS = 86_400_000; // 24h u milisekundama

/** Default retencija: poruke nestaju posle 24h. */
export const EPHEMERAL_DEFAULT_MS = DAY_MS;
/** „Save chat" retencija: poruke žive 30 dana. */
export const EPHEMERAL_SAVED_MS = 30 * DAY_MS;

/** Retencioni prozor konverzacije u ms: 30d ako je „Save chat" ON, inače 24h. */
export function retentionMs(saved: boolean): number {
  return saved ? EPHEMERAL_SAVED_MS : EPHEMERAL_DEFAULT_MS;
}

/**
 * Trenutak (epoch ms) kad poruka ističe = `createdAt + retentionMs(saved)`.
 * `null` ako je `createdAt` nevažeći (NaN/∞) — nepoznat unos se ne briše.
 */
export function messageExpiresAt(createdAt: number, saved: boolean): number | null {
  if (!Number.isFinite(createdAt)) return null;
  return createdAt + retentionMs(saved);
}

/**
 * Da li je poruka istekla (kandidat za brisanje / „Deleted message…" placeholder)
 * u trenutku `now`. Fail-safe: nevažeći `createdAt`/`now` → `false` (ne briši na
 * nepoznatom ulazu). Granica `now === expiresAt` se tretira kao ISTEKLO
 * (dosledno `chatHours`: `now >= expiresAt`).
 */
export function isMessageExpired(
  createdAt: number,
  saved: boolean,
  now: number,
): boolean {
  const expiresAt = messageExpiresAt(createdAt, saved);
  if (expiresAt == null || !Number.isFinite(now)) return false;
  return now >= expiresAt;
}

/** Preostalo ms do isteka poruke (0 ako je isteklo ili je unos nevažeći). */
export function msUntilMessageExpiry(
  createdAt: number,
  saved: boolean,
  now: number,
): number {
  const expiresAt = messageExpiresAt(createdAt, saved);
  if (expiresAt == null || !Number.isFinite(now)) return 0;
  return Math.max(0, expiresAt - now);
}

/**
 * Prag za batch brisanje (T3.13): poruka je istekla akko `createdAt <= cutoff`.
 * `cutoff = now - retentionMs(saved)`. `null` ako je `now` nevažeći (preskoči
 * sweep umesto da se obriše sve). Po definiciji se poklapa sa `isMessageExpired`.
 */
export function expiryCutoff(saved: boolean, now: number): number | null {
  if (!Number.isFinite(now)) return null;
  return now - retentionMs(saved);
}

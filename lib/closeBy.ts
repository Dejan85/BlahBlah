// Close-By Connections — geo obračun „ko je fizički u blizini" (radius 20–30m).
// FEATURES.md A6, SCREENS.md Search 6.0 (labela „Close By"). Čista funkcija
// (BEZ React/UI/Supabase) — v. ARCHITECTURE.md §2.5.
//
// ── Model ─────────────────────────────────────────────────────────────────────
// Lokacija korisnika = `profiles.latitude/longitude` (WGS-84 stepeni; puni se iz
// `hooks/useLocation`). Blizina = geodetsko rastojanje između dve tačke; korisnik
// je „Close By" kad je ≤ radijus (spec: 20–30m → default 30m, donja granica 20m).
//
// Rastojanje računamo HAVERSINE formulom nad sferom (Zemljin radijus 6 371 000 m).
// Na ovako malim rastojanjima (deseci metara) zakrivljenost je zanemarljiva, ali
// haversine je tačan i stabilan i ne uvodi grešku kod prelaza meridijana/ekvatora.
//
// Fail-safe (§2.5 guard): bilo koja nevažeća koordinata (NaN/∞/van opsega
// lat ±90, lng ±180) → rastojanje `Infinity` → NIKAD „close by" (radije sakrij
// nego lažno prikaži nekoga kao u blizini).

/** Geografska tačka u stepenima (poklapa se sa `profiles.latitude/longitude`). */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Zemljin srednji radijus u metrima (sferni model). */
const EARTH_RADIUS_M = 6_371_000;

/** Donja granica „Close By" radijusa po spec-u (Search 6.0 / A6). */
export const CLOSE_BY_MIN_RADIUS_M = 20;
/** Gornja granica „Close By" radijusa po spec-u. */
export const CLOSE_BY_MAX_RADIUS_M = 30;
/** Podrazumevani radijus discovery-ja (gornja granica = najinkluzivniji unutar spec-a). */
export const CLOSE_BY_RADIUS_M = CLOSE_BY_MAX_RADIUS_M;

const DEG_TO_RAD = Math.PI / 180;

/** Validna WGS-84 koordinata (konačni brojevi u opsegu lat ±90, lng ±180). */
function isValidCoord(c: Coordinates | null | undefined): c is Coordinates {
  if (!c) return false;
  const { latitude, longitude } = c;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Geodetsko rastojanje (metri) između dve tačke (haversine).
 * Nevažeća koordinata → `Infinity` (fail-safe: nikad nije „blizu").
 */
export function haversineDistanceM(a: Coordinates, b: Coordinates): number {
  if (!isValidCoord(a) || !isValidCoord(b)) return Infinity;

  const lat1 = a.latitude * DEG_TO_RAD;
  const lat2 = b.latitude * DEG_TO_RAD;
  const dLat = (b.latitude - a.latitude) * DEG_TO_RAD;
  const dLng = (b.longitude - a.longitude) * DEG_TO_RAD;

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Da li je `other` unutar `radiusM` od `origin` (default {@link CLOSE_BY_RADIUS_M}).
 * Granica je inkluzivna (tačno na radijusu = „close by"). Nevažeći radijus → false.
 */
export function isCloseBy(
  origin: Coordinates,
  other: Coordinates,
  radiusM: number = CLOSE_BY_RADIUS_M
): boolean {
  if (!Number.isFinite(radiusM) || radiusM < 0) return false;
  return haversineDistanceM(origin, other) <= radiusM;
}

/** Kandidat sa koordinatama (npr. red iz `profiles`); generičan za UI wiring (T3.19). */
export type WithCoordinates<T> = T & Coordinates;

/**
 * Iz liste kandidata vrati one unutar radijusa od `origin`, **sortirane rastuće po
 * rastojanju** (najbliži prvi), svaki obogaćen izračunatim `distanceM`.
 * Nevažeća `origin` lokacija → prazna lista (ne možemo meriti blizinu).
 */
export function closeByUsers<T extends Coordinates>(
  origin: Coordinates,
  candidates: readonly T[],
  radiusM: number = CLOSE_BY_RADIUS_M
): (T & { distanceM: number })[] {
  if (!isValidCoord(origin) || !Number.isFinite(radiusM) || radiusM < 0) return [];

  return candidates
    .map((c) => ({ ...c, distanceM: haversineDistanceM(origin, c) }))
    .filter((c) => c.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

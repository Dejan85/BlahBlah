import {
  Coordinates,
  CLOSE_BY_MIN_RADIUS_M,
  CLOSE_BY_MAX_RADIUS_M,
  CLOSE_BY_RADIUS_M,
  haversineDistanceM,
  isCloseBy,
  closeByUsers,
} from './closeBy';

// Referentna tačka (Beograd, proizvoljno). 1° latitude ≈ 111 195 m (R=6 371 000),
// pa 0.0001° lat ≈ 11.12 m — zgodno za testiranje granica radijusa od 20–30m.
const ORIGIN: Coordinates = { latitude: 44.8125, longitude: 20.4612 };

/** Pomeri tačku za dati broj metara na sever (po latitudi). */
function metersNorth(origin: Coordinates, meters: number): Coordinates {
  const dLat = meters / 111_194.9; // metri po stepenu latitude
  return { latitude: origin.latitude + dLat, longitude: origin.longitude };
}

describe('konstante radijusa', () => {
  it('poštuju spec opseg 20–30m', () => {
    expect(CLOSE_BY_MIN_RADIUS_M).toBe(20);
    expect(CLOSE_BY_MAX_RADIUS_M).toBe(30);
    expect(CLOSE_BY_RADIUS_M).toBe(30); // default = gornja granica
  });
});

describe('haversineDistanceM', () => {
  it('vraća 0 za identičnu tačku', () => {
    expect(haversineDistanceM(ORIGIN, { ...ORIGIN })).toBeCloseTo(0, 6);
  });

  it('meri ~10m za pomeraj od 10m na sever', () => {
    const d = haversineDistanceM(ORIGIN, metersNorth(ORIGIN, 10));
    expect(d).toBeGreaterThan(9.9);
    expect(d).toBeLessThan(10.1);
  });

  it('meri ~25m za pomeraj od 25m', () => {
    const d = haversineDistanceM(ORIGIN, metersNorth(ORIGIN, 25));
    expect(d).toBeCloseTo(25, 1);
  });

  it('simetričan je (a→b == b→a)', () => {
    const b = metersNorth(ORIGIN, 18);
    expect(haversineDistanceM(ORIGIN, b)).toBeCloseTo(haversineDistanceM(b, ORIGIN), 6);
  });

  it('radi i preko meridijana (lng 179.9999 ↔ -179.9999)', () => {
    const a: Coordinates = { latitude: 0, longitude: 179.9999 };
    const b: Coordinates = { latitude: 0, longitude: -179.9999 };
    const d = haversineDistanceM(a, b);
    // 0.0002° lng na ekvatoru ≈ 22.2 m (ne ~40 000 km obилазном)
    expect(d).toBeLessThan(25);
  });

  it('nevažeća koordinata → Infinity (fail-safe)', () => {
    expect(haversineDistanceM(ORIGIN, { latitude: NaN, longitude: 0 })).toBe(Infinity);
    expect(haversineDistanceM(ORIGIN, { latitude: 91, longitude: 0 })).toBe(Infinity);
    expect(haversineDistanceM(ORIGIN, { latitude: 0, longitude: 200 })).toBe(Infinity);
    expect(haversineDistanceM({ latitude: Infinity, longitude: 0 }, ORIGIN)).toBe(Infinity);
  });
});

describe('isCloseBy', () => {
  it('tačka unutar default radijusa (30m) je close by', () => {
    expect(isCloseBy(ORIGIN, metersNorth(ORIGIN, 25))).toBe(true);
  });

  it('tačka van default radijusa nije close by', () => {
    expect(isCloseBy(ORIGIN, metersNorth(ORIGIN, 35))).toBe(false);
  });

  it('granica je inkluzivna (tačno na radijusu = close by)', () => {
    const point = metersNorth(ORIGIN, 20);
    const exactDist = haversineDistanceM(ORIGIN, point);
    expect(isCloseBy(ORIGIN, point, exactDist)).toBe(true); // <= granica
    expect(isCloseBy(ORIGIN, point, exactDist - 0.001)).toBe(false); // tik ispod → ne
  });

  it('poštuje uži radijus (20m): 25m nije unutar 20m', () => {
    expect(isCloseBy(ORIGIN, metersNorth(ORIGIN, 25), CLOSE_BY_MIN_RADIUS_M)).toBe(false);
    expect(isCloseBy(ORIGIN, metersNorth(ORIGIN, 15), CLOSE_BY_MIN_RADIUS_M)).toBe(true);
  });

  it('nevažeći radijus → false', () => {
    expect(isCloseBy(ORIGIN, ORIGIN, NaN)).toBe(false);
    expect(isCloseBy(ORIGIN, ORIGIN, -5)).toBe(false);
  });

  it('nevažeća koordinata → false (nikad lažno blizu)', () => {
    expect(isCloseBy(ORIGIN, { latitude: NaN, longitude: 0 })).toBe(false);
  });
});

describe('closeByUsers', () => {
  const candidates = [
    { id: 'a', ...metersNorth(ORIGIN, 5) },
    { id: 'b', ...metersNorth(ORIGIN, 28) },
    { id: 'c', ...metersNorth(ORIGIN, 100) }, // van radijusa
    { id: 'd', ...metersNorth(ORIGIN, 15) },
    { id: 'bad', latitude: NaN, longitude: 0 }, // nevažeća → odbačena
  ];

  it('vraća samo one unutar default radijusa, sortirane po blizini', () => {
    const result = closeByUsers(ORIGIN, candidates);
    expect(result.map((r) => r.id)).toEqual(['a', 'd', 'b']);
  });

  it('obogaćuje svaki rezultat sa distanceM', () => {
    const result = closeByUsers(ORIGIN, candidates);
    expect(result[0].distanceM).toBeCloseTo(5, 0);
    expect(result[0].id).toBe('a');
  });

  it('uži radijus (20m) izbacuje kandidata na 28m', () => {
    const result = closeByUsers(ORIGIN, candidates, CLOSE_BY_MIN_RADIUS_M);
    expect(result.map((r) => r.id)).toEqual(['a', 'd']);
  });

  it('nevažeća origin lokacija → prazna lista', () => {
    expect(closeByUsers({ latitude: NaN, longitude: 0 }, candidates)).toEqual([]);
  });

  it('prazna lista kandidata → prazna lista', () => {
    expect(closeByUsers(ORIGIN, [])).toEqual([]);
  });

  it('nevažeći radijus → prazna lista', () => {
    expect(closeByUsers(ORIGIN, candidates, -1)).toEqual([]);
  });
});

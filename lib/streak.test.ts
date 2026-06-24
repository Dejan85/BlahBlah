import {
  registerBlah,
  getStreakStatus,
  currentStreakDay,
  isStreakLost,
  isStreakBonusDay,
  isBunnyActive,
  msUntilDeadline,
  STREAK_BONUS_DAYS,
  EMPTY_STREAK,
  type StreakState,
} from './streak';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Podne 24.06.2026 UTC kao stabilna referenca.
const NOON = Date.UTC(2026, 5, 24, 12, 0, 0);

describe('isStreakBonusDay', () => {
  it('true samo na spec danima 8/20/28/48', () => {
    for (const d of STREAK_BONUS_DAYS) expect(isStreakBonusDay(d)).toBe(true);
  });

  it('false na granicama i nasumičnim danima', () => {
    for (const d of [0, 7, 9, 19, 21, 27, 29, 47, 49, 100]) {
      expect(isStreakBonusDay(d)).toBe(false);
    }
  });

  it('ne-konačni ulaz → false', () => {
    expect(isStreakBonusDay(NaN)).toBe(false);
    expect(isStreakBonusDay(Infinity)).toBe(false);
  });
});

describe('registerBlah', () => {
  it('prvi Blah ikad → dan 1', () => {
    expect(registerBlah(EMPTY_STREAK, NOON)).toEqual({ day: 1, lastBlahAt: NOON });
  });

  it('stanje sa day=0 se tretira kao bez streak-a → dan 1', () => {
    expect(registerBlah({ day: 0, lastBlahAt: NOON - 5 * DAY }, NOON)).toEqual({
      day: 1,
      lastBlahAt: NOON,
    });
  });

  it('isti kalendarski dan → bez promene dana, pamti najkasniji Blah', () => {
    const prev: StreakState = { day: 3, lastBlahAt: NOON };
    const next = registerBlah(prev, NOON + 5 * HOUR);
    expect(next).toEqual({ day: 3, lastBlahAt: NOON + 5 * HOUR });
  });

  it('isti dan ali raniji Blah (skew unutar dana) → ne pomera lastBlahAt unazad', () => {
    const prev: StreakState = { day: 3, lastBlahAt: NOON };
    const next = registerBlah(prev, NOON - 2 * HOUR);
    expect(next).toEqual({ day: 3, lastBlahAt: NOON });
  });

  it('sledeći kalendarski dan → dan + 1', () => {
    const prev: StreakState = { day: 3, lastBlahAt: NOON };
    const next = registerBlah(prev, NOON + DAY);
    expect(next).toEqual({ day: 4, lastBlahAt: NOON + DAY });
  });

  it('uzastopni dan i kad je razmak <24h (kasno pa rano sledeći dan)', () => {
    // 23:00 dan A → 01:00 dan B = 2h razmaka, ali DVA kalendarska dana → advance
    const late = Date.UTC(2026, 5, 24, 23, 0, 0);
    const early = Date.UTC(2026, 5, 25, 1, 0, 0);
    expect(registerBlah({ day: 5, lastBlahAt: late }, early)).toEqual({
      day: 6,
      lastBlahAt: early,
    });
  });

  it('preskočen ceo dan → reset na dan 1', () => {
    const prev: StreakState = { day: 10, lastBlahAt: NOON };
    expect(registerBlah(prev, NOON + 2 * DAY)).toEqual({ day: 1, lastBlahAt: NOON + 2 * DAY });
    expect(registerBlah(prev, NOON + 5 * DAY)).toEqual({ day: 1, lastBlahAt: NOON + 5 * DAY });
  });

  it('Blah pre poslednjeg (skew preko granice dana) → bez promene', () => {
    const prev: StreakState = { day: 4, lastBlahAt: NOON };
    expect(registerBlah(prev, NOON - 2 * DAY)).toEqual(prev);
  });

  it('ne-konačni now → vraća prethodno stanje netaknuto', () => {
    const prev: StreakState = { day: 4, lastBlahAt: NOON };
    expect(registerBlah(prev, NaN)).toBe(prev);
    expect(registerBlah(prev, Infinity)).toBe(prev);
  });

  it('ne mutira ulazno stanje', () => {
    const prev: StreakState = { day: 3, lastBlahAt: NOON };
    registerBlah(prev, NOON + DAY);
    expect(prev).toEqual({ day: 3, lastBlahAt: NOON });
  });

  describe('timezone — granice dana', () => {
    // 23:30 UTC: u UTC je još dan A; u CET (+60) je već dan B (00:30).
    const lateUtc = Date.UTC(2026, 5, 24, 23, 30, 0);
    // +90 min kasnije = 01:00 UTC dan B (i u CET 02:00 dan B).
    const nextUtc = Date.UTC(2026, 5, 25, 1, 0, 0);

    it('UTC: oba u istom danu A vs B daju različit ishod od CET', () => {
      const prev: StreakState = { day: 2, lastBlahAt: lateUtc };
      // U UTC: lateUtc=danA, nextUtc=danB → advance
      expect(registerBlah(prev, nextUtc, 0).day).toBe(3);
    });

    it('CET (+60): lateUtc je već dan B, nextUtc isti dan B → bez advance-a', () => {
      const prev: StreakState = { day: 2, lastBlahAt: lateUtc };
      const next = registerBlah(prev, nextUtc, 60);
      expect(next.day).toBe(2); // isti CET dan → nema promene
      expect(next.lastBlahAt).toBe(nextUtc);
    });
  });
});

describe('getStreakStatus', () => {
  it('nema streak-a → none', () => {
    expect(getStreakStatus(EMPTY_STREAK, NOON)).toBe('none');
    expect(getStreakStatus({ day: 0, lastBlahAt: null }, NOON)).toBe('none');
  });

  it('blah danas → active', () => {
    expect(getStreakStatus({ day: 3, lastBlahAt: NOON }, NOON + 5 * HOUR)).toBe('active');
  });

  it('budući skew (now pre lastBlahAt, isti/raniji dan) → active', () => {
    expect(getStreakStatus({ day: 3, lastBlahAt: NOON }, NOON - 2 * HOUR)).toBe('active');
  });

  it('nov dan, danas još nema Blah → at-risk', () => {
    expect(getStreakStatus({ day: 3, lastBlahAt: NOON }, NOON + DAY)).toBe('at-risk');
  });

  it('protekao ceo dan bez Blah-a → lost', () => {
    expect(getStreakStatus({ day: 3, lastBlahAt: NOON }, NOON + 2 * DAY)).toBe('lost');
    expect(getStreakStatus({ day: 9, lastBlahAt: NOON }, NOON + 10 * DAY)).toBe('lost');
  });
});

describe('currentStreakDay', () => {
  it('vraća dužinu dok je živ (active/at-risk)', () => {
    expect(currentStreakDay({ day: 7, lastBlahAt: NOON }, NOON + 5 * HOUR)).toBe(7);
    expect(currentStreakDay({ day: 7, lastBlahAt: NOON }, NOON + DAY)).toBe(7);
  });

  it('0 kad je streak pao (lost)', () => {
    expect(currentStreakDay({ day: 7, lastBlahAt: NOON }, NOON + 3 * DAY)).toBe(0);
  });

  it('0 kad nema streak-a', () => {
    expect(currentStreakDay(EMPTY_STREAK, NOON)).toBe(0);
  });

  it('rezultat se uklapa u calculateBlahScore (bonus dan 8)', () => {
    // day=8 i živ → currentStreakDay=8 (bonus dan); pali → 0 (bez bonusa)
    expect(currentStreakDay({ day: 8, lastBlahAt: NOON }, NOON + 3 * HOUR)).toBe(8);
    expect(isStreakBonusDay(currentStreakDay({ day: 8, lastBlahAt: NOON }, NOON + 3 * HOUR))).toBe(
      true,
    );
  });
});

describe('isStreakLost', () => {
  it('živ streak (active/at-risk) → false', () => {
    expect(isStreakLost({ day: 7, lastBlahAt: NOON }, NOON + 5 * HOUR)).toBe(false);
    expect(isStreakLost({ day: 7, lastBlahAt: NOON }, NOON + DAY)).toBe(false); // at-risk
  });

  it('protekao ceo dan → true', () => {
    expect(isStreakLost({ day: 7, lastBlahAt: NOON }, NOON + 2 * DAY)).toBe(true);
  });

  it('nema streak-a → false (nema šta da padne)', () => {
    expect(isStreakLost(EMPTY_STREAK, NOON + 10 * DAY)).toBe(false);
  });
});

// ⚠️ PINNING: zakuje tačno granicu reseta koju serverski pg_cron sweep
// (reset_lapsed_streaks() u migraciji) portuje u SQL. Ako ovaj test pukne,
// granica se promenila → MORA se uskladiti i SQL sweep, inače lib i baza
// nuliraju streak na različitim mestima (drift).
describe('PINNING: SQL sweep granica == isStreakLost', () => {
  // Mirror lib dayKey() i SQL-a: floor((epoch_sekunde + tz*60) / 86400).
  const sqlDay = (ms: number, tz: number) => Math.floor((ms / 1000 + tz * 60) / 86400);
  // Mirror SQL WHERE: nowDay - lastDay >= 2 (uz iste guard-ove kao lib).
  const sqlWouldReset = (s: StreakState, now: number, tz: number) =>
    s.day > 0 && s.lastBlahAt != null && sqlDay(now, tz) - sqlDay(s.lastBlahAt, tz) >= 2;

  it('SQL formula i isStreakLost daju identičan ishod oko granice (UTC i CET)', () => {
    const last = Date.UTC(2026, 5, 24, 23, 30, 0); // 23:30 UTC = dan B u CET
    for (const tz of [0, 60, -300, 330]) {
      for (let h = 0; h <= 80; h++) {
        const now = last + h * HOUR;
        const state: StreakState = { day: 5, lastBlahAt: last };
        expect(sqlWouldReset(state, now, tz)).toBe(isStreakLost(state, now, tz));
      }
    }
  });
});

describe('rolling deadline / Bunny (Home 2.0)', () => {
  it('msUntilDeadline broji do 24h od poslednjeg Blah-a', () => {
    expect(msUntilDeadline({ day: 1, lastBlahAt: NOON }, NOON)).toBe(DAY);
    expect(msUntilDeadline({ day: 1, lastBlahAt: NOON }, NOON + 20 * HOUR)).toBe(4 * HOUR);
  });

  it('msUntilDeadline = 0 kad je isteklo ili nema Blah-a', () => {
    expect(msUntilDeadline({ day: 1, lastBlahAt: NOON }, NOON + 25 * HOUR)).toBe(0);
    expect(msUntilDeadline(EMPTY_STREAK, NOON)).toBe(0);
  });

  it('Bunny aktivan tačno u poslednja 3h (≤3h pre 24h)', () => {
    const s: StreakState = { day: 1, lastBlahAt: NOON };
    expect(isBunnyActive(s, NOON + 20 * HOUR)).toBe(false); // ostalo 4h
    expect(isBunnyActive(s, NOON + 21 * HOUR)).toBe(true); // ostalo tačno 3h
    expect(isBunnyActive(s, NOON + 23 * HOUR)).toBe(true); // ostalo 1h
  });

  it('Bunny neaktivan kad je isteklo (ostalo 0) i kad nema Blah-a', () => {
    expect(isBunnyActive({ day: 1, lastBlahAt: NOON }, NOON + 24 * HOUR)).toBe(false);
    expect(isBunnyActive({ day: 1, lastBlahAt: NOON }, NOON + 30 * HOUR)).toBe(false);
    expect(isBunnyActive(EMPTY_STREAK, NOON)).toBe(false);
  });
});

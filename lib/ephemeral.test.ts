import {
  EPHEMERAL_DEFAULT_MS,
  EPHEMERAL_SAVED_MS,
  retentionMs,
  messageExpiresAt,
  isMessageExpired,
  msUntilMessageExpiry,
  expiryCutoff,
} from './ephemeral';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const T0 = 1_700_000_000_000; // proizvoljan epoch ms (createdAt poruke)

describe('konstante / retentionMs', () => {
  test('default = 24h, saved = 30 dana', () => {
    expect(EPHEMERAL_DEFAULT_MS).toBe(24 * HOUR);
    expect(EPHEMERAL_SAVED_MS).toBe(30 * DAY);
  });

  test('retentionMs bira prozor po toggle-u', () => {
    expect(retentionMs(false)).toBe(24 * HOUR);
    expect(retentionMs(true)).toBe(30 * DAY);
  });
});

describe('messageExpiresAt', () => {
  test('default: createdAt + 24h', () => {
    expect(messageExpiresAt(T0, false)).toBe(T0 + DAY);
  });

  test('saved: createdAt + 30 dana', () => {
    expect(messageExpiresAt(T0, true)).toBe(T0 + 30 * DAY);
  });

  test('nevažeći createdAt → null', () => {
    expect(messageExpiresAt(NaN, false)).toBeNull();
    expect(messageExpiresAt(Infinity, true)).toBeNull();
  });
});

describe('isMessageExpired — default (24h)', () => {
  test('tek poslata poruka nije istekla', () => {
    expect(isMessageExpired(T0, false, T0)).toBe(false);
  });

  test('1h pre granice — živa', () => {
    expect(isMessageExpired(T0, false, T0 + DAY - HOUR)).toBe(false);
  });

  test('tačno na 24h granici → istekla (now >= expiresAt)', () => {
    expect(isMessageExpired(T0, false, T0 + DAY)).toBe(true);
  });

  test('posle 24h → istekla', () => {
    expect(isMessageExpired(T0, false, T0 + DAY + HOUR)).toBe(true);
  });
});

describe('isMessageExpired — saved (30 dana)', () => {
  test('poruka stara 25h: saved produžava → još živa', () => {
    expect(isMessageExpired(T0, true, T0 + DAY + HOUR)).toBe(false);
  });

  test('29 dana — živa', () => {
    expect(isMessageExpired(T0, true, T0 + 29 * DAY)).toBe(false);
  });

  test('tačno na 30 dana → istekla', () => {
    expect(isMessageExpired(T0, true, T0 + 30 * DAY)).toBe(true);
  });

  test('31 dan → istekla', () => {
    expect(isMessageExpired(T0, true, T0 + 31 * DAY)).toBe(true);
  });
});

describe('toggle „Save chat" menja sudbinu iste poruke (⚡ ivični slučaj)', () => {
  const ageOf25h = T0 + DAY + HOUR; // poruka stara 25h

  test('OFF → istekla, ON → živa (isti createdAt i now)', () => {
    expect(isMessageExpired(T0, false, ageOf25h)).toBe(true); // bez Save: gone
    expect(isMessageExpired(T0, true, ageOf25h)).toBe(false); // sa Save: ostaje
  });

  test('isključivanje Save-a skraćuje na 24h → poruke >24h odmah istek­le', () => {
    const age10d = T0 + 10 * DAY;
    expect(isMessageExpired(T0, true, age10d)).toBe(false); // dok je Save ON
    expect(isMessageExpired(T0, false, age10d)).toBe(true); // posle gašenja Save
  });
});

describe('clock skew / fail-safe', () => {
  test('createdAt u budućnosti → nije istekla', () => {
    expect(isMessageExpired(T0 + DAY, false, T0)).toBe(false);
  });

  test('nevažeći now → fail-safe false (ne briši na nepoznatom)', () => {
    expect(isMessageExpired(T0, false, NaN)).toBe(false);
    expect(isMessageExpired(T0, true, Infinity)).toBe(false);
  });

  test('nevažeći createdAt → false', () => {
    expect(isMessageExpired(NaN, false, T0)).toBe(false);
  });
});

describe('msUntilMessageExpiry', () => {
  test('na pola 24h prozora → ~12h preostalo', () => {
    expect(msUntilMessageExpiry(T0, false, T0 + 12 * HOUR)).toBe(12 * HOUR);
  });

  test('posle isteka → 0 (clamp)', () => {
    expect(msUntilMessageExpiry(T0, false, T0 + 2 * DAY)).toBe(0);
  });

  test('saved prozor — preostalo do 30 dana', () => {
    expect(msUntilMessageExpiry(T0, true, T0 + DAY)).toBe(29 * DAY);
  });

  test('nevažeći unos → 0', () => {
    expect(msUntilMessageExpiry(NaN, false, T0)).toBe(0);
    expect(msUntilMessageExpiry(T0, false, NaN)).toBe(0);
  });
});

describe('expiryCutoff', () => {
  test('default: now - 24h', () => {
    expect(expiryCutoff(false, T0)).toBe(T0 - DAY);
  });

  test('saved: now - 30 dana', () => {
    expect(expiryCutoff(true, T0)).toBe(T0 - 30 * DAY);
  });

  test('nevažeći now → null (preskoči sweep, ne briši sve)', () => {
    expect(expiryCutoff(false, NaN)).toBeNull();
  });
});

describe('pinning: SQL job intervali == lib konstante (T3.13)', () => {
  // delete_expired_messages() (migracija ..._ephemeral_messages_retention_job.sql)
  // koristi literal interval '24 hours' / '30 days' kao cutoff. Ovaj test zakiva
  // da ti literali NE mogu tiho da se raziđu od lib retencije (anti-drift, kao T3.6).
  test("interval '24 hours' == EPHEMERAL_DEFAULT_MS", () => {
    expect(EPHEMERAL_DEFAULT_MS).toBe(24 * HOUR);
  });

  test("interval '30 days' == EPHEMERAL_SAVED_MS", () => {
    expect(EPHEMERAL_SAVED_MS).toBe(30 * DAY);
  });

  test('SQL predikat created_at <= now() - retencija == expiryCutoff', () => {
    // SQL: created_at <= now() - interval ; lib: createdAt <= expiryCutoff(saved, now)
    const now = T0 + 50 * DAY;
    expect(expiryCutoff(false, now)).toBe(now - 24 * HOUR);
    expect(expiryCutoff(true, now)).toBe(now - 30 * DAY);
  });
});

describe('pinning: batch cutoff == per-poruka isMessageExpired', () => {
  // T3.13 SQL sweep koristi `createdAt <= cutoff`; mora dati isti rezultat kao
  // `isMessageExpired` koji koristi UI. Proveravamo oko obe granice (24h, 30d).
  const now = T0 + 100 * DAY;
  const samples = [
    now, // upravo poslata
    now - HOUR,
    now - DAY + 1, // tik pre 24h
    now - DAY, // tačno 24h
    now - DAY - 1, // tik posle 24h
    now - 30 * DAY + 1, // tik pre 30d
    now - 30 * DAY, // tačno 30d
    now - 30 * DAY - 1, // tik posle 30d
    now - 100 * DAY, // davno
  ];

  for (const saved of [false, true]) {
    test(`saved=${saved}: cutoff i per-poruka se slažu`, () => {
      const cutoff = expiryCutoff(saved, now) as number;
      for (const createdAt of samples) {
        const viaPredicate = isMessageExpired(createdAt, saved, now);
        const viaCutoff = createdAt <= cutoff;
        expect(viaCutoff).toBe(viaPredicate);
      }
    });
  }
});

import {
  chatExpiresAt,
  getChatHoursStatus,
  chatHours,
  msUntilChatExpiry,
  registerMessage,
  formatChatHours,
  EMPTY_CHAT_HOURS,
  CHAT_HOURS_WINDOW_MS,
  CHAT_HOURS_WARNING_MS,
  type ChatHoursState,
} from './chatHours';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Stabilan anchor: podne 24.06.2026 UTC.
const T0 = Date.UTC(2026, 5, 24, 12, 0, 0);

/** Pomoćnik: serija u kojoj su obe strane poslale u istom trenutku `t`. */
function mutualAt(t: number): ChatHoursState {
  return registerMessage(registerMessage(EMPTY_CHAT_HOURS, 'them', t), 'me', t);
}

describe('konstante', () => {
  it('prozor je 24h, upozorenje 3h (A5)', () => {
    expect(CHAT_HOURS_WINDOW_MS).toBe(DAY);
    expect(CHAT_HOURS_WARNING_MS).toBe(3 * HOUR);
  });
});

describe('chatExpiresAt', () => {
  it('null dok bar jedna strana nije poslala', () => {
    expect(chatExpiresAt(EMPTY_CHAT_HOURS)).toBeNull();
    expect(chatExpiresAt({ startedAt: null, lastFromMe: T0, lastFromThem: null })).toBeNull();
    expect(chatExpiresAt({ startedAt: null, lastFromMe: null, lastFromThem: T0 })).toBeNull();
  });

  it('= min(obe strane) + 24h — vezuje strana koja je poslala najdavnije', () => {
    const s: ChatHoursState = { startedAt: T0, lastFromMe: T0 + 5 * HOUR, lastFromThem: T0 };
    expect(chatExpiresAt(s)).toBe(T0 + DAY);
  });
});

describe('getChatHoursStatus', () => {
  it("'none' za prazno stanje ili nevažeći now", () => {
    expect(getChatHoursStatus(EMPTY_CHAT_HOURS, T0)).toBe('none');
    expect(getChatHoursStatus(mutualAt(T0), NaN)).toBe('none');
  });

  it("'active' dok je daleko od isteka", () => {
    expect(getChatHoursStatus(mutualAt(T0), T0 + 10 * HOUR)).toBe('active');
  });

  it("'at-risk' u poslednja 3h pre isteka", () => {
    const s = mutualAt(T0); // ističe na T0+24h
    expect(getChatHoursStatus(s, T0 + 21 * HOUR)).toBe('at-risk'); // tačno 3h pre
    expect(getChatHoursStatus(s, T0 + 23 * HOUR)).toBe('at-risk');
    expect(getChatHoursStatus(s, T0 + 21 * HOUR - 1)).toBe('active'); // tik pre zone
  });

  it("'expired' tačno na 24h i posle", () => {
    const s = mutualAt(T0);
    expect(getChatHoursStatus(s, T0 + DAY)).toBe('expired');
    expect(getChatHoursStatus(s, T0 + DAY + HOUR)).toBe('expired');
  });
});

describe('chatHours (vidljivi brojač)', () => {
  it('0 za praznu/neživu seriju', () => {
    expect(chatHours(EMPTY_CHAT_HOURS, T0)).toBe(0);
  });

  it('ceo broj sati od početka serije (floor)', () => {
    expect(chatHours(mutualAt(T0), T0)).toBe(0);
    // Serija počela u T0 i još živa (obe strane slale skoro) → 83h59m = 83h.
    const now = T0 + 83 * HOUR + 59 * 60_000;
    const live: ChatHoursState = { startedAt: T0, lastFromMe: now - HOUR, lastFromThem: now - HOUR };
    expect(chatHours(live, now)).toBe(83);
  });

  it('0 kad je istekla (padaju na 0)', () => {
    expect(chatHours(mutualAt(T0), T0 + DAY)).toBe(0);
  });

  it('0 pre početka (clock skew unazad)', () => {
    expect(chatHours(mutualAt(T0), T0 - HOUR)).toBe(0);
  });

  it('veliki brojač opstaje dok je serija živa (npr. 4600h)', () => {
    // Obe strane šalju na svakih 23h (unutar 24h prozora) → serija nikad ne pada.
    let s = mutualAt(T0);
    let t = T0;
    for (let i = 0; i < 200; i++) {
      t += 23 * HOUR;
      s = registerMessage(s, 'them', t);
      s = registerMessage(s, 'me', t);
    }
    expect(s.startedAt).toBe(T0); // serija ista od početka
    expect(chatHours(s, t)).toBe(200 * 23); // 4600h neprekidno
  });
});

describe('msUntilChatExpiry', () => {
  it('odbrojava do isteka, pa 0', () => {
    const s = mutualAt(T0);
    expect(msUntilChatExpiry(s, T0)).toBe(DAY);
    expect(msUntilChatExpiry(s, T0 + 20 * HOUR)).toBe(4 * HOUR);
    expect(msUntilChatExpiry(s, T0 + DAY)).toBe(0);
    expect(msUntilChatExpiry(s, T0 + DAY + HOUR)).toBe(0);
  });

  it('0 kad serija ne postoji', () => {
    expect(msUntilChatExpiry(EMPTY_CHAT_HOURS, T0)).toBe(0);
  });
});

describe('registerMessage — obostranost (oboje moraju slati u 24h)', () => {
  it('jedna strana sama NE pokreće seriju', () => {
    const s = registerMessage(EMPTY_CHAT_HOURS, 'me', T0);
    expect(s.startedAt).toBeNull();
    expect(getChatHoursStatus(s, T0)).toBe('none');
    expect(chatHours(s, T0)).toBe(0);
  });

  it('spam jedne strane i dalje ne drži seriju živom', () => {
    let s = registerMessage(EMPTY_CHAT_HOURS, 'me', T0);
    s = registerMessage(s, 'me', T0 + HOUR);
    s = registerMessage(s, 'me', T0 + 2 * HOUR);
    expect(s.startedAt).toBeNull();
  });

  it('odgovor druge strane u 24h pokreće seriju od ranijeg sidra', () => {
    const s0 = registerMessage(EMPTY_CHAT_HOURS, 'them', T0); // oni u T0
    const s1 = registerMessage(s0, 'me', T0 + 2 * HOUR); // ja 2h kasnije
    expect(s1.startedAt).toBe(T0); // serija teče od njihove (ranije) poruke
    expect(getChatHoursStatus(s1, T0 + 2 * HOUR)).toBe('active');
    expect(chatHours(s1, T0 + 2 * HOUR)).toBe(2);
  });

  it('odgovor posle >24h NE oživljava staru seriju (prekasno)', () => {
    const s0 = registerMessage(EMPTY_CHAT_HOURS, 'them', T0);
    const s1 = registerMessage(s0, 'me', T0 + 25 * HOUR); // van 24h prozora
    expect(s1.startedAt).toBeNull();
    expect(getChatHoursStatus(s1, T0 + 25 * HOUR)).toBe('none');
  });
});

describe('registerMessage — reset/produženje žive serije', () => {
  it('poruka produžava rok isteka, startedAt ostaje (brojač raste)', () => {
    const s0 = mutualAt(T0); // startedAt = T0, ističe T0+24h
    const s1 = registerMessage(s0, 'me', T0 + 10 * HOUR); // ja šaljem ponovo
    expect(s1.startedAt).toBe(T0); // serija se ne resetuje
    // Rok i dalje vezuje druga strana (oni u T0) → ističe T0+24h
    expect(chatExpiresAt(s1)).toBe(T0 + DAY);
    const s2 = registerMessage(s1, 'them', T0 + 10 * HOUR); // i oni odgovore
    expect(chatExpiresAt(s2)).toBe(T0 + 10 * HOUR + DAY); // rok pomeren
    expect(s2.startedAt).toBe(T0); // ali serija i dalje od T0
  });

  it('posle isteka, obostrana aktivnost pokreće NOVU seriju od 0', () => {
    const s0 = mutualAt(T0);
    expect(getChatHoursStatus(s0, T0 + 30 * HOUR)).toBe('expired');
    // Ja pišem posle pada (30h) — sam ne oživljava
    const s1 = registerMessage(s0, 'me', T0 + 30 * HOUR);
    expect(s1.startedAt).toBeNull();
    // Oni odgovore 1h kasnije → nova serija od ranijeg sidra (moja poruka 30h)
    const s2 = registerMessage(s1, 'them', T0 + 31 * HOUR);
    expect(s2.startedAt).toBe(T0 + 30 * HOUR);
    expect(chatHours(s2, T0 + 31 * HOUR)).toBe(1);
  });
});

describe('registerMessage — guardovi', () => {
  it('nevažeći now vraća isto stanje', () => {
    const s = mutualAt(T0);
    expect(registerMessage(s, 'me', NaN)).toBe(s);
    expect(registerMessage(s, 'me', Infinity)).toBe(s);
  });

  it('skew unazad ne pomera poslednju poruku te strane', () => {
    const s0 = mutualAt(T0 + 10 * HOUR);
    const s1 = registerMessage(s0, 'me', T0); // raniji timestamp od postojećeg
    expect(s1.lastFromMe).toBe(T0 + 10 * HOUR); // zadržava kasniji
  });
});

describe('formatChatHours', () => {
  it('ceo broj + h', () => {
    expect(formatChatHours(83)).toBe('83h');
    expect(formatChatHours(4783)).toBe('4783h');
    expect(formatChatHours(17)).toBe('17h');
  });

  it('0/negativ/nevažeće → „0h"', () => {
    expect(formatChatHours(0)).toBe('0h');
    expect(formatChatHours(-5)).toBe('0h');
    expect(formatChatHours(NaN)).toBe('0h');
    expect(formatChatHours(Infinity)).toBe('0h');
  });

  it('skida decimale (floor)', () => {
    expect(formatChatHours(83.9)).toBe('83h');
  });
});

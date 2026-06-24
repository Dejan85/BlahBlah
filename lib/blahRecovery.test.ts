import {
  streakLostAt,
  recoveryOfferExpiresAt,
  getRecoveryStatus,
  isRecoveryAvailable,
  msUntilStreakLost,
  msUntilOfferExpires,
  isRecoveryUrgent,
  RECOVERY_GRACE_MS,
  RECOVERY_OFFER_MS,
  RECOVERY_URGENCY_MS,
  RECOVERY_PRICE_EUR,
} from './blahRecovery';

const HOUR = 60 * 60 * 1000;

// Poslednji Blah: podne 24.06.2026 UTC kao stabilna referenca (anchor).
const LAST = Date.UTC(2026, 5, 24, 12, 0, 0);
const LOST = LAST + 26 * HOUR; // streak pada
const OFFER_END = LOST + 13 * HOUR; // ponuda istиče (= LAST + 39h)

describe('konstante', () => {
  it('prozori i cena po spec-u (A4 / MyProfile 8.8)', () => {
    expect(RECOVERY_GRACE_MS).toBe(26 * HOUR);
    expect(RECOVERY_OFFER_MS).toBe(13 * HOUR);
    expect(RECOVERY_URGENCY_MS).toBe(3 * HOUR);
    expect(RECOVERY_PRICE_EUR).toBe(1.99);
  });
});

describe('streakLostAt / recoveryOfferExpiresAt', () => {
  it('računa 26h i 26h+13h od poslednjeg Blah-a', () => {
    expect(streakLostAt(LAST)).toBe(LOST);
    expect(recoveryOfferExpiresAt(LAST)).toBe(OFFER_END);
  });

  it('null kad nema poslatog Blah-a ili je ulaz nevažeći', () => {
    expect(streakLostAt(null)).toBeNull();
    expect(streakLostAt(NaN)).toBeNull();
    expect(streakLostAt(Infinity)).toBeNull();
    expect(recoveryOfferExpiresAt(null)).toBeNull();
    expect(recoveryOfferExpiresAt(NaN)).toBeNull();
  });
});

describe('getRecoveryStatus', () => {
  it("'safe' dok je unutar 26h", () => {
    expect(getRecoveryStatus(LAST, LAST)).toBe('safe');
    expect(getRecoveryStatus(LAST, LAST + 25 * HOUR)).toBe('safe');
    expect(getRecoveryStatus(LAST, LOST - 1)).toBe('safe');
  });

  it("tačno na 26h → 'recoverable' (ponuda se otvara)", () => {
    expect(getRecoveryStatus(LAST, LOST)).toBe('recoverable');
  });

  it("'recoverable' kroz ceo 13h prozor ponude", () => {
    expect(getRecoveryStatus(LAST, LOST + HOUR)).toBe('recoverable');
    expect(getRecoveryStatus(LAST, OFFER_END - 1)).toBe('recoverable');
  });

  it("tačno na 39h → 'expired' (ponuda istekla)", () => {
    expect(getRecoveryStatus(LAST, OFFER_END)).toBe('expired');
    expect(getRecoveryStatus(LAST, OFFER_END + HOUR)).toBe('expired');
  });

  it("'expired' kad nema Blah-a ili je now nevažeći", () => {
    expect(getRecoveryStatus(null, LAST)).toBe('expired');
    expect(getRecoveryStatus(LAST, NaN)).toBe('expired');
    expect(getRecoveryStatus(LAST, Infinity)).toBe('expired');
  });
});

describe('isRecoveryAvailable', () => {
  it('true samo u 26h–39h prozoru', () => {
    expect(isRecoveryAvailable(LAST, LOST - 1)).toBe(false); // još safe
    expect(isRecoveryAvailable(LAST, LOST)).toBe(true);
    expect(isRecoveryAvailable(LAST, OFFER_END - 1)).toBe(true);
    expect(isRecoveryAvailable(LAST, OFFER_END)).toBe(false); // isteklo
    expect(isRecoveryAvailable(null, LOST)).toBe(false);
  });
});

describe('msUntilStreakLost', () => {
  it('puni 26h u trenutku poslednjeg Blah-a, pa opada', () => {
    expect(msUntilStreakLost(LAST, LAST)).toBe(26 * HOUR);
    expect(msUntilStreakLost(LAST, LAST + 10 * HOUR)).toBe(16 * HOUR);
  });

  it('0 na granici i posle pada', () => {
    expect(msUntilStreakLost(LAST, LOST)).toBe(0);
    expect(msUntilStreakLost(LAST, LOST + HOUR)).toBe(0);
  });

  it('0 kad nema Blah-a ili je now nevažeći', () => {
    expect(msUntilStreakLost(null, LAST)).toBe(0);
    expect(msUntilStreakLost(LAST, NaN)).toBe(0);
  });
});

describe('msUntilOfferExpires', () => {
  it('opada 13h→0 kroz prozor ponude', () => {
    expect(msUntilOfferExpires(LAST, LOST)).toBe(13 * HOUR);
    expect(msUntilOfferExpires(LAST, LOST + 5 * HOUR)).toBe(8 * HOUR);
    expect(msUntilOfferExpires(LAST, OFFER_END)).toBe(0);
    expect(msUntilOfferExpires(LAST, OFFER_END + HOUR)).toBe(0);
  });

  it('dok je safe vrednost prelazi 13h (uključuje preostali grace)', () => {
    expect(msUntilOfferExpires(LAST, LAST)).toBe(39 * HOUR);
  });

  it('0 kad nema Blah-a ili je now nevažeći', () => {
    expect(msUntilOfferExpires(null, LAST)).toBe(0);
    expect(msUntilOfferExpires(LAST, NaN)).toBe(0);
  });
});

describe('isRecoveryUrgent', () => {
  it('false ranije od poslednja 3h pre pada', () => {
    expect(isRecoveryUrgent(LAST, LAST)).toBe(false);
    expect(isRecoveryUrgent(LAST, LOST - 3 * HOUR - 1)).toBe(false); // preostalo > 3h
  });

  it('true u poslednja 3h pre pada (uključujući tačnu granicu od 3h)', () => {
    expect(isRecoveryUrgent(LAST, LOST - 3 * HOUR)).toBe(true); // preostalo tačno 3h
    expect(isRecoveryUrgent(LAST, LOST - HOUR)).toBe(true);
    expect(isRecoveryUrgent(LAST, LOST - 1)).toBe(true);
  });

  it('false u trenutku pada i posle (više nije „pre" pada)', () => {
    expect(isRecoveryUrgent(LAST, LOST)).toBe(false);
    expect(isRecoveryUrgent(LAST, LOST + HOUR)).toBe(false);
  });

  it('false kad nema Blah-a', () => {
    expect(isRecoveryUrgent(null, LAST)).toBe(false);
  });
});

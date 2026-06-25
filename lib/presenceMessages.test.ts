import {
  getPresenceZone,
  pickPresenceMessage,
  presenceMessage,
  roundedPresenceLabel,
  PRESENCE_MESSAGES,
  type PresenceZone,
} from './presenceMessages';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe('getPresenceZone — opsezi i granice', () => {
  it('0–10min → just-now (granica 10min ulazi u minutes)', () => {
    expect(getPresenceZone(0)).toBe('just-now');
    expect(getPresenceZone(9 * MINUTE)).toBe('just-now');
    expect(getPresenceZone(10 * MINUTE)).toBe('minutes');
  });

  it('10min–1h → minutes (granica 1h → hours-early)', () => {
    expect(getPresenceZone(30 * MINUTE)).toBe('minutes');
    expect(getPresenceZone(HOUR - 1)).toBe('minutes');
    expect(getPresenceZone(HOUR)).toBe('hours-early');
  });

  it('1–5h → hours-early (granica 5h → hours-mid)', () => {
    expect(getPresenceZone(HOUR)).toBe('hours-early');
    expect(getPresenceZone(5 * HOUR - 1)).toBe('hours-early');
    expect(getPresenceZone(5 * HOUR)).toBe('hours-mid');
  });

  it('5–12h → hours-mid (granica 12h → hours-late)', () => {
    expect(getPresenceZone(8 * HOUR)).toBe('hours-mid');
    expect(getPresenceZone(12 * HOUR - 1)).toBe('hours-mid');
    expect(getPresenceZone(12 * HOUR)).toBe('hours-late');
  });

  it('12–24h → hours-late (granica 24h → days)', () => {
    expect(getPresenceZone(20 * HOUR)).toBe('hours-late');
    expect(getPresenceZone(DAY - 1)).toBe('hours-late');
    expect(getPresenceZone(DAY)).toBe('days');
  });

  it('1–3 dana → days (granica 3d → long-gone)', () => {
    expect(getPresenceZone(2 * DAY)).toBe('days');
    expect(getPresenceZone(3 * DAY - 1)).toBe('days');
    expect(getPresenceZone(3 * DAY)).toBe('long-gone');
  });

  it('>3 dana → long-gone', () => {
    expect(getPresenceZone(10 * DAY)).toBe('long-gone');
  });

  it('nevažeći / negativan ulaz → just-now (bezbedan default)', () => {
    expect(getPresenceZone(NaN)).toBe('just-now');
    expect(getPresenceZone(-1000)).toBe('just-now');
    expect(getPresenceZone(Infinity)).toBe('just-now'); // ∞ nije finite → bezbedan default
  });
});

describe('pickPresenceMessage — izbor iz zone', () => {
  const zones: PresenceZone[] = [
    'just-now',
    'minutes',
    'hours-early',
    'hours-mid',
    'hours-late',
    'days',
    'long-gone',
  ];

  it('random=0 vraća prvi element zone', () => {
    for (const z of zones) {
      expect(pickPresenceMessage(z, 0)).toBe(PRESENCE_MESSAGES[z][0]);
    }
  });

  it('random→1 (skoro) vraća poslednji element zone', () => {
    for (const z of zones) {
      const list = PRESENCE_MESSAGES[z];
      expect(pickPresenceMessage(z, 0.999)).toBe(list[list.length - 1]);
    }
  });

  it('uvek vraća poruku iz odgovarajuće liste (raspon random vrednosti)', () => {
    for (const z of zones) {
      for (let r = 0; r < 1; r += 0.07) {
        expect(PRESENCE_MESSAGES[z]).toContain(pickPresenceMessage(z, r));
      }
    }
  });

  it('nevažeći random (NaN/<0/≥1) se klampuje → validna poruka', () => {
    expect(pickPresenceMessage('minutes', NaN)).toBe(PRESENCE_MESSAGES.minutes[0]);
    expect(pickPresenceMessage('minutes', -5)).toBe(PRESENCE_MESSAGES.minutes[0]);
    const list = PRESENCE_MESSAGES.minutes;
    expect(pickPresenceMessage('minutes', 5)).toBe(list[list.length - 1]);
  });
});

describe('presenceMessage — spoj zone + poruke', () => {
  it('bira iz liste tačne zone', () => {
    expect(PRESENCE_MESSAGES['just-now']).toContain(presenceMessage(MINUTE, 0.3));
    expect(PRESENCE_MESSAGES['days']).toContain(presenceMessage(2 * DAY, 0.5));
  });

  it('drugačiji random može dati drugačiju poruku iste zone (menja se na povratak)', () => {
    const a = presenceMessage(2 * HOUR, 0);
    const b = presenceMessage(2 * HOUR, 0.99);
    expect(a).not.toBe(b);
    expect(PRESENCE_MESSAGES['hours-early']).toContain(a);
    expect(PRESENCE_MESSAGES['hours-early']).toContain(b);
  });
});

describe('roundedPresenceLabel — floor zaokruživanje (spec primer)', () => {
  it('<1min → "now"', () => {
    expect(roundedPresenceLabel(0)).toBe('now');
    expect(roundedPresenceLabel(MINUTE - 1)).toBe('now');
  });

  it('minuti se odsecaju', () => {
    expect(roundedPresenceLabel(MINUTE)).toBe('1m');
    expect(roundedPresenceLabel(7 * MINUTE + 59_000)).toBe('7m');
    expect(roundedPresenceLabel(59 * MINUTE)).toBe('59m');
  });

  it('10h35m → "10h", 11h01m → "11h" (floor, ne matematičko)', () => {
    expect(roundedPresenceLabel(10 * HOUR + 35 * MINUTE)).toBe('10h');
    expect(roundedPresenceLabel(11 * HOUR + MINUTE)).toBe('11h');
  });

  it('dani se odsecaju', () => {
    expect(roundedPresenceLabel(DAY)).toBe('1d');
    expect(roundedPresenceLabel(2 * DAY + 23 * HOUR)).toBe('2d');
  });

  it('nevažeći ulaz → "now"', () => {
    expect(roundedPresenceLabel(NaN)).toBe('now');
  });
});

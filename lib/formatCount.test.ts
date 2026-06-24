import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('ispod 1000 → ceo broj bez sufiksa', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('ne-celi brojevi ispod 1000 se zaokružuju (256.8 → "257")', () => {
    expect(formatCount(256.8)).toBe('257');
    expect(formatCount(0.4)).toBe('0');
  });

  it('hiljade → "k", primeri iz spec-a', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(10000)).toBe('10k'); // spec: 10.000 → "10k"
    expect(formatCount(10100)).toBe('10.1k'); // spec: "10.1k"
  });

  it('skida suvišnu .0 (1.0k → 1k), zadržava pravu decimalu', () => {
    expect(formatCount(2000)).toBe('2k');
    expect(formatCount(1234)).toBe('1.2k');
    expect(formatCount(99900)).toBe('99.9k');
    expect(formatCount(500000)).toBe('500k');
  });

  it('mantisa se zaokružuje na 1 decimalu (nearest)', () => {
    expect(formatCount(1240)).toBe('1.2k');
    expect(formatCount(1250)).toBe('1.3k'); // round half-up
    expect(formatCount(1290)).toBe('1.3k');
  });

  it('milioni → "M", milijarde → "B"', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(1_200_000)).toBe('1.2M');
    expect(formatCount(15_000_000)).toBe('15M');
    expect(formatCount(1_000_000_000)).toBe('1B');
    expect(formatCount(2_500_000_000)).toBe('2.5B');
  });

  it('zaokruživanje preliva u sledeću jedinicu (999_999 → "1M")', () => {
    expect(formatCount(999_999)).toBe('1M'); // 999.999k → zaokruženo 1000k → 1M
    expect(formatCount(999_999_999)).toBe('1B');
  });

  it('ne preliva prerano (mantisa < 1000 ostaje u nižoj jedinici)', () => {
    expect(formatCount(950_000)).toBe('950k');
    expect(formatCount(990_000)).toBe('990k');
    expect(formatCount(999_500)).toBe('999.5k'); // tek ≥ 999_950 prelazi u "1M"
  });

  it('negativni brojevi zadržavaju znak', () => {
    expect(formatCount(-50)).toBe('-50');
    expect(formatCount(-1500)).toBe('-1.5k');
    expect(formatCount(-2_000_000)).toBe('-2M');
  });

  it('ne-konačne vrednosti → "0"', () => {
    expect(formatCount(NaN)).toBe('0');
    expect(formatCount(Infinity)).toBe('0');
    expect(formatCount(-Infinity)).toBe('0');
  });
});

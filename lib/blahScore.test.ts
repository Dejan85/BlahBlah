import { calculateBlahScore } from './blahScore';

describe('calculateBlahScore', () => {
  it('spec primer (FEATURES.md A2): 8. dan, 10 blahs, 10 followers = 68', () => {
    // 40 (10×4) + 8 (10×0.8) + 20 (streak bonus 10×2) = 68
    expect(calculateBlahScore(10, 10, 8)).toBe(68);
  });

  it('bazni slučaj bez streak bonusa (običan dan)', () => {
    // 40 + 8 + 0 = 48
    expect(calculateBlahScore(10, 10, 7)).toBe(48);
    expect(calculateBlahScore(10, 10, 1)).toBe(48);
    expect(calculateBlahScore(10, 10, 9)).toBe(48);
  });

  it('streak bonus se aktivira na svim spec danima (8/20/28/48)', () => {
    for (const day of [8, 20, 28, 48]) {
      // base 48 + bonus 20 = 68
      expect(calculateBlahScore(10, 10, day)).toBe(68);
    }
  });

  it('dani van liste nemaju bonus (granice)', () => {
    for (const day of [0, 7, 21, 27, 29, 47, 49, 100]) {
      expect(calculateBlahScore(10, 10, day)).toBe(48);
    }
  });

  it('nule → 0', () => {
    expect(calculateBlahScore(0, 0, 8)).toBe(0);
    expect(calculateBlahScore(0, 0, 1)).toBe(0);
  });

  it('zaokružuje na ceo broj (followers × 0.8 daje decimale)', () => {
    // 0 + 1×0.8 = 0.8 → 1
    expect(calculateBlahScore(0, 1, 1)).toBe(1);
    // 0 + 3×0.8 = 2.4 → 2
    expect(calculateBlahScore(0, 3, 1)).toBe(2);
    // 0 + 4×0.8 = 3.2 → 3
    expect(calculateBlahScore(0, 4, 1)).toBe(3);
  });

  it('samo followers (bez blahova → bonus je 0 čak i na streak danu)', () => {
    // bonus = blahs×2 = 0 kad nema blahova; 50×0.8 = 40
    expect(calculateBlahScore(0, 50, 8)).toBe(40);
  });

  it('veći realan slučaj', () => {
    // 100×4 + 250×0.8 + (streak 100×2) = 400 + 200 + 200 = 800
    expect(calculateBlahScore(100, 250, 20)).toBe(800);
    // isti, običan dan: 400 + 200 = 600
    expect(calculateBlahScore(100, 250, 19)).toBe(600);
  });

  it('ne-konačni ulazi se tretiraju kao 0 (skor nikad NaN)', () => {
    expect(calculateBlahScore(NaN, 10, 8)).toBe(8);
    expect(calculateBlahScore(10, Infinity, 8)).toBe(60); // 40 + 0 + 20
    expect(calculateBlahScore(10, 10, NaN)).toBe(48); // NaN dan → bez bonusa
  });
});

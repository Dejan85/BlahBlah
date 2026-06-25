import {
  isPremiumActive,
  canAccessPremiumFeature,
  premiumExpiresInMs,
  premiumUntilAfterPurchase,
  PREMIUM_FEATURES,
  PREMIUM_PLAN_DAYS,
  PREMIUM_PRICE_MONTHLY_EUR,
  PREMIUM_PRICE_YEARLY_EUR,
  SCORE_BOOST_MULTIPLIER,
  type PremiumFeature,
  type PremiumStatus,
} from './premium';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);

describe('konstante (Camera 4.6 / FEATURES E)', () => {
  it('cene pretplate po spec-u', () => {
    expect(PREMIUM_PRICE_MONTHLY_EUR).toBe(4.99);
    expect(PREMIUM_PRICE_YEARLY_EUR).toBe(29.94);
  });

  it('trajanje planova i score boost', () => {
    expect(PREMIUM_PLAN_DAYS.monthly).toBe(30);
    expect(PREMIUM_PLAN_DAYS.yearly).toBe(365);
    expect(SCORE_BOOST_MULTIPLIER).toBe(1.1);
  });

  it('pet pogodnosti iza paywall-a', () => {
    expect(PREMIUM_FEATURES).toEqual([
      'who_viewed',
      'score_boost',
      'lock_posts',
      'no_ads',
      'customization',
    ]);
  });
});

describe('isPremiumActive', () => {
  it('aktivan kad je premiumUntil u budućnosti', () => {
    expect(isPremiumActive({ premiumUntil: NOW + DAY }, NOW)).toBe(true);
  });

  it('neaktivan kad je istekao (premiumUntil u prošlosti)', () => {
    expect(isPremiumActive({ premiumUntil: NOW - DAY }, NOW)).toBe(false);
  });

  it('granica: tačno sada (premiumUntil === now) → istekao (strogo u budućnosti)', () => {
    expect(isPremiumActive({ premiumUntil: NOW }, NOW)).toBe(false);
  });

  it('null premiumUntil → nije premium', () => {
    expect(isPremiumActive({ premiumUntil: null }, NOW)).toBe(false);
  });

  it('fail-safe: NaN/∞ → false (nikad lažno premium)', () => {
    expect(isPremiumActive({ premiumUntil: NaN }, NOW)).toBe(false);
    expect(isPremiumActive({ premiumUntil: Infinity }, NOW)).toBe(false);
    expect(isPremiumActive({ premiumUntil: NOW + DAY }, NaN)).toBe(false);
  });
});

describe('canAccessPremiumFeature', () => {
  const active: PremiumStatus = { premiumUntil: NOW + DAY };
  const inactive: PremiumStatus = { premiumUntil: null };

  it('premium korisnik sme svaku pogodnost', () => {
    for (const f of PREMIUM_FEATURES) {
      expect(canAccessPremiumFeature(f, active, NOW)).toBe(true);
    }
  });

  it('non-premium korisnik ne sme nijednu', () => {
    for (const f of PREMIUM_FEATURES) {
      expect(canAccessPremiumFeature(f, inactive, NOW)).toBe(false);
    }
  });

  it('nepoznata pogodnost → false čak i za premium', () => {
    expect(
      canAccessPremiumFeature('bogus' as PremiumFeature, active, NOW)
    ).toBe(false);
  });
});

describe('premiumExpiresInMs', () => {
  it('preostalo vreme kad je aktivan', () => {
    expect(premiumExpiresInMs({ premiumUntil: NOW + 5 * DAY }, NOW)).toBe(
      5 * DAY
    );
  });

  it('0 kad nije aktivan', () => {
    expect(premiumExpiresInMs({ premiumUntil: NOW - DAY }, NOW)).toBe(0);
    expect(premiumExpiresInMs({ premiumUntil: null }, NOW)).toBe(0);
  });
});

describe('premiumUntilAfterPurchase', () => {
  it('monthly od now kad nije premium', () => {
    expect(premiumUntilAfterPurchase('monthly', NOW)).toBe(NOW + 30 * DAY);
  });

  it('yearly od now kad nije premium', () => {
    expect(premiumUntilAfterPurchase('yearly', NOW)).toBe(NOW + 365 * DAY);
  });

  it('nadovezuje se na postojeći istek kad je još aktivan', () => {
    const current: PremiumStatus = { premiumUntil: NOW + 10 * DAY };
    expect(premiumUntilAfterPurchase('monthly', NOW, current)).toBe(
      NOW + 10 * DAY + 30 * DAY
    );
  });

  it('kreće od now kad je postojeća pretplata istekla', () => {
    const expired: PremiumStatus = { premiumUntil: NOW - DAY };
    expect(premiumUntilAfterPurchase('yearly', NOW, expired)).toBe(
      NOW + 365 * DAY
    );
  });

  it('fail-safe: nevažeći now → baza 0 + trajanje plana', () => {
    expect(premiumUntilAfterPurchase('monthly', NaN)).toBe(30 * DAY);
  });
});

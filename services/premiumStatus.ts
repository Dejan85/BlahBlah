// RevenueCat boundary za Blah+ pretplatu (Camera 4.6 / FEATURES E — T3.20).
//
// Side-effecting (čitanje entitlement-a + plaćanje) → NE ide u lib/ (lib je čist,
// vidi ARCHITECTURE §2.5). Čista pravila gejtovanja i aritmetika datuma žive u
// lib/premium.ts; ovde je tanak IO sloj koji UI/kontekst poziva.
//
// ⚠️ TRENUTNO STUB (T3.20 odluka, isto kao services/recoveryPurchase.ts T3.8):
// `react-native-purchases` je u package.json ali RevenueCat ključevi + store
// proizvodi (App Store / Play) još NISU konfigurisani. Izvor istine za status je za
// sada DB kolona profiles.premium_until; purchasePremium SIMULIRA uspeh. Kad budu
// proizvodi: flip `PREMIUM_PURCHASE_STUBBED` na false + otkomentariši pravi tok niže —
// potpisi ostaju isti, pa pozivaoci (PremiumContext) se ne menjaju.

import { supabase } from '@/utils/supabase';
import type { PremiumStatus, PremiumPlan } from '@/lib/premium';

/** Jedini prekidač: dok je true, kupovina se SIMULIRA (nema žive RevenueCat veze). */
export const PREMIUM_PURCHASE_STUBBED = true;

/** RevenueCat entitlement koji predstavlja aktivan Blah+ (kad se konfiguriše). */
export const PREMIUM_ENTITLEMENT_ID = 'blah_plus';

/** Identifikatori pretplatnih proizvoda u RevenueCat-u (kad se konfigurišu). */
export const PREMIUM_PRODUCT_IDS: Record<PremiumPlan, string> = {
  monthly: 'blah_plus_monthly',
  yearly: 'blah_plus_yearly',
};

export interface PurchaseResult {
  /** true = plaćanje uspelo; pozivalac sme da upiše novi premium_until. */
  success: boolean;
  /** true = korisnik otkazao tok — NE tretirati kao grešku (bez Alert-a). */
  cancelled?: boolean;
  /** Poruka za prikaz kad success=false i nije cancelled. */
  error?: string;
}

/**
 * Pročitaj premium status korisnika. Izvor istine za sada = `profiles.premium_until`.
 * (Pravi izvor kad RevenueCat proradi: `Purchases.getCustomerInfo()` →
 * `entitlements.active[PREMIUM_ENTITLEMENT_ID].expirationDate`.)
 */
export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('premium_until')
    .eq('id', userId)
    .single();
  if (error || !data?.premium_until) return { premiumUntil: null };
  return { premiumUntil: new Date(data.premium_until).getTime() };
}

/**
 * Pokreni kupovinu Blah+ pretplate (monthly/yearly).
 *
 * STUB: simulira uspešnu kupovinu (omogućava da se ceo tok — paywall → upis
 * `premium_until` → gating kroz app — testira na uređaju bez žive naplate).
 * Pozivalac (PremiumContext) na success upisuje novi `premium_until` preko
 * lib/premium `premiumUntilAfterPurchase`.
 *
 * Pravi tok (kad `PREMIUM_PURCHASE_STUBBED = false`):
 *   import Purchases from 'react-native-purchases';
 *   const offerings = await Purchases.getOfferings();
 *   const pkg = offerings.current?.availablePackages
 *     .find((p) => p.product.identifier === PREMIUM_PRODUCT_IDS[plan]);
 *   if (!pkg) return { success: false, error: 'Plan nije dostupan.' };
 *   const { customerInfo } = await Purchases.purchasePackage(pkg);
 *   const ent = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
 *   if (!ent) return { success: false, error: 'Pretplata nije aktivirana.' };
 *   return { success: true };  // status onda iz ent.expirationDate (getPremiumStatus)
 *   // u catch-u: ako je e.userCancelled → { success: false, cancelled: true }
 */
export async function purchasePremium(
  plan: PremiumPlan
): Promise<PurchaseResult> {
  if (PREMIUM_PURCHASE_STUBBED) {
    console.warn(
      `[premiumStatus] STUB: simuliram uspešnu kupovinu Blah+ (${plan}) — ` +
        `RevenueCat nije konfigurisan (vidi services/premiumStatus.ts).`
    );
    return { success: true };
  }

  // Bez konfiguracije ne smemo lažirati uspeh u produkciji.
  return {
    success: false,
    error: 'Blah+ pretplata još nije konfigurisana.',
  };
}

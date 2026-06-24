// RevenueCat boundary za Blah Recovery (€1.99 jednokratno — MyProfile 8.8 / FEATURES A4).
//
// Side-effecting (plaćanje) → NE ide u lib/ (lib je čist, vidi ARCHITECTURE §2.5).
// Ovde živi tanak IO sloj koji UI poziva; čista logika prozora/skora ostaje u
// lib/blahRecovery.ts + lib/streak.ts.
//
// ⚠️ TRENUTNO STUB (T3.8 odluka): `react-native-purchases` je u package.json ali
// RevenueCat ključevi i store proizvodi (App Store / Play) još NISU konfigurisani.
// Kad budu: prebaci `RECOVERY_PURCHASE_STUBBED` na false i otkomentariši pravi tok
// niže — potpis `purchaseRecovery()` ostaje isti, pa pozivaoci (profil) se ne menjaju.

import { RECOVERY_PRICE_EUR } from '@/lib/blahRecovery';

/** Jedini prekidač: dok je true, kupovina se SIMULIRA (nema žive RevenueCat veze). */
export const RECOVERY_PURCHASE_STUBBED = true;

/** Identifikator one-time recovery proizvoda u RevenueCat-u (kad se konfiguriše). */
export const RECOVERY_PRODUCT_ID = 'blah_recovery_onetime';

export interface PurchaseResult {
  /** true = plaćanje uspelo, pozivalac sme da primeni recovery (applyRecovery). */
  success: boolean;
  /** true = korisnik otkazao tok — NE tretirati kao grešku (bez Alert-a). */
  cancelled?: boolean;
  /** Poruka za prikaz kad success=false i nije cancelled. */
  error?: string;
}

/**
 * Pokreni kupovinu Blah Recovery (€1.99 jednokratno).
 *
 * STUB: simulira uspešnu kupovinu (omogućava da se ostatak toka — applyRecovery +
 * upis u `profiles` + nov 26h ciklus — testira na uređaju bez žive naplate).
 *
 * Pravi tok (kad `RECOVERY_PURCHASE_STUBBED = false`):
 *   import Purchases from 'react-native-purchases';
 *   const offerings = await Purchases.getOfferings();
 *   const pkg = offerings.current?.availablePackages
 *     .find((p) => p.product.identifier === RECOVERY_PRODUCT_ID);
 *   if (!pkg) return { success: false, error: 'Recovery proizvod nije dostupan.' };
 *   const { customerInfo } = await Purchases.purchasePackage(pkg);
 *   // verifikuj da je transakcija prošla (non-subscription entitlement / receipt)
 *   return { success: true };
 *   // u catch-u: ako je e.userCancelled → { success: false, cancelled: true }
 */
export async function purchaseRecovery(): Promise<PurchaseResult> {
  if (RECOVERY_PURCHASE_STUBBED) {
    console.warn(
      `[recoveryPurchase] STUB: simuliram uspešnu kupovinu €${RECOVERY_PRICE_EUR} ` +
        `(RevenueCat nije konfigurisan — vidi services/recoveryPurchase.ts).`
    );
    return { success: true };
  }

  // Bez konfiguracije ne smemo lažirati uspeh u produkciji.
  return {
    success: false,
    error: 'Blah Recovery plaćanje još nije konfigurisano.',
  };
}

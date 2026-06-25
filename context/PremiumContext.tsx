import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  canAccessPremiumFeature,
  isPremiumActive,
  premiumUntilAfterPurchase,
  type PremiumFeature,
  type PremiumPlan,
  type PremiumStatus,
} from '@/lib/premium';
import {
  getPremiumStatus,
  purchasePremium,
  type PurchaseResult,
} from '@/services/premiumStatus';

// Cross-cutting Blah+ gating (T3.20). Jedna tačka za „da li je korisnik premium" +
// „sme li pogodnost X" kroz ceo app (Camera 4.6 lock post, MyProfile 8.6–8.7 paywall,
// kasnije T3.21–T3.24). Status = profiles.premium_until (services/premiumStatus.ts);
// pravila/aritmetika su čisti u lib/premium.ts.

interface PremiumContextType {
  /** Sirovo stanje pretplate (premiumUntil epoch ms / null). */
  status: PremiumStatus;
  /** Da li je premium AKTIVAN sada (izvedeno iz status-a). */
  isPremium: boolean;
  /** Dok prvi fetch statusa traje. */
  loading: boolean;
  /** Da li korisnik sme datu premium pogodnost (jedinstveni gate). */
  canAccess: (feature: PremiumFeature) => boolean;
  /** Ponovo pročitaj status iz baze. */
  refresh: () => Promise<void>;
  /** Kupi pretplatu (stub naplata → upis premium_until → osvežavanje). */
  purchase: (plan: PremiumPlan) => Promise<PurchaseResult>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatus>({ premiumUntil: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus({ premiumUntil: null });
      setLoading(false);
      return;
    }
    try {
      setStatus(await getPremiumStatus(user.id));
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (plan: PremiumPlan): Promise<PurchaseResult> => {
      if (!user) return { success: false, error: 'Niste prijavljeni.' };
      const result = await purchasePremium(plan);
      if (!result.success) return result;

      // Naplata uspela (stub) → izračunaj nov istek (lib/) i upiši ga; status je
      // izvor istine, pa ga odmah osveži u memoriji (i baza je sinhronizovana).
      const premiumUntil = premiumUntilAfterPurchase(plan, Date.now(), status);
      const { error } = await supabase
        .from('profiles')
        .update({ premium_until: new Date(premiumUntil).toISOString() })
        .eq('id', user.id);
      if (error) return { success: false, error: error.message };

      setStatus({ premiumUntil });
      return { success: true };
    },
    [user, status]
  );

  const value = useMemo<PremiumContextType>(
    () => ({
      status,
      isPremium: isPremiumActive(status, Date.now()),
      loading,
      canAccess: (feature: PremiumFeature) =>
        canAccessPremiumFeature(feature, status, Date.now()),
      refresh,
      purchase,
    }),
    [status, loading, refresh, purchase]
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

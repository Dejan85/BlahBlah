import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type PlanType = 'monthly' | 'yearly' | 'onetime';

interface PlanProps {
  onSelectPlan: (plan: PlanType) => void;
  selectedPlan?: PlanType;
  isBlahs?: boolean;
  isPremium?: boolean;
}

const SubscriptionPlans: React.FC<PlanProps> = ({
  onSelectPlan,
  selectedPlan = 'monthly',
  isBlahs = false,
  isPremium = true,
}) => {
  const [selected, setSelected] = useState<PlanType>(selectedPlan);

  const handleSelection = (plan: PlanType) => {
    setSelected(plan);
    onSelectPlan(plan);
  };

  return (
    <View style={styles.container}>
      {isPremium && (
        <>
          <TouchableOpacity
            style={[
              styles.planContainer,
              selected === 'monthly' && styles.selectedPlan,
            ]}
            onPress={() => handleSelection('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>Monthly Plan €4.99/month</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selected === 'monthly' && styles.checkboxSelected,
                ]}
              >
                {selected === 'monthly' && (
                  <View style={styles.checkboxInner} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planContainer,
              selected === 'yearly' && styles.selectedPlan,
            ]}
            onPress={() => handleSelection('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>
                  Yearly Plan €29.94/year{' '}
                  <Text style={styles.discountText}>50% off</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selected === 'yearly' && styles.checkboxSelected,
                ]}
              >
                {selected === 'yearly' && <View style={styles.checkboxInner} />}
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}

      {isBlahs && (
        <TouchableOpacity
          style={[
            styles.planContainer,
            selected === 'onetime' && styles.selectedPlan,
          ]}
          onPress={() => handleSelection('onetime')}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>
                Blahs Recovery €1.99/one time use
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                selected === 'onetime' && styles.checkboxSelected,
              ]}
            >
              {selected === 'onetime' && <View style={styles.checkboxInner} />}
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 38,
    gap: 12,
    marginVertical: 20,
  },
  planContainer: {},
  selectedPlan: {},
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#111',
    backgroundColor: '#fff',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111',
  },
  planInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  planTitle: {
    fontSize: 15,
    fontFamily: 'InterMedium',
    color: '#111',
  },
  planPrice: {
    fontSize: 14,
    color: '#666666',
  },
  discountBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#FF325E',
    fontSize: 15,
    fontFamily: 'InterMedium',
  },
});

export default SubscriptionPlans;

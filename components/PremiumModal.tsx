import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Eye,
  DefaultBunny,
  Rocket,
  Stop,
  Exclusive,
  RedBunny,
  BlahRecoveryBlack,
} from '@/assets/images';
import BottomModal from '@/components/BottomModal';
import SettingItem from '@/components/SettingItem';
import CustomButton from '@/components/CustomButton';
import SubscriptionPlans from './SubsciptionPlans';

const { height: windowHeight } = Dimensions.get('window');

interface PremiumModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPlanSelection: (plan: 'monthly' | 'yearly') => void;
  onContinue: () => void;
  onPlanSelectionForBlah?: (plan: 'onetimeuse') => void;
  isBlahs?: boolean;
  isPremium?: boolean;
  /** Recovery: dinamičan tekst odbrojavanja ponude (npr. "In 13h offer expire"). */
  offerSubtitle?: string;
  /** Recovery: dok kupovina traje → spinner umesto "Continue". */
  processing?: boolean;
}

const PremiumModal: React.FC<PremiumModalProps> = ({
  isVisible,
  onClose,
  onContinue,
  isBlahs = false,
  isPremium = true,
  offerSubtitle,
  processing = false,
}) => {
  const handlePlanSelection = (plan: 'monthly' | 'yearly' | 'onetime') => {
    // Handle the plan selection here
    console.log('Selected plan:', plan);
  };

  return (
    <BottomModal
      height={windowHeight * 0.9}
      visible={isVisible}
      onClose={onClose}
      line={false}
      modalStyle={styles.modalContainer}
    >
      <View>
        <View style={styles.headerModal}>
          <RedBunny width={80} height={80} />
          {isPremium && <Text style={styles.title}>Upgrade to Blah +</Text>}
          {isBlahs && <Text style={styles.title}>Oops...Blahs!</Text>}
        </View>

        <View style={styles.settingsContainer}>
          {isPremium && (
            <>
              <SettingItem
                icon={<Eye />}
                title="See Who Viewed Your Profile"
                isSwitch={false}
                subtitle="Keep 3 of your posts permanently"
                subtitleStyle={styles.subtitleStyle}
              />

              <SettingItem
                icon={<DefaultBunny />}
                title="Lock 3+ Posts Forever"
                isSwitch={false}
                subtitle="Track profile visits from the last 8 days"
                subtitleStyle={styles.subtitleStyle}
              />

              <SettingItem
                icon={<Rocket />}
                title="Blah Score Boost (+10%)"
                isSwitch={false}
                subtitle="Get a 10% multiplier on your Blah Score"
                subtitleStyle={styles.subtitleStyle}
              />

              <SettingItem
                icon={<Stop />}
                title="No Ads"
                isSwitch={false}
                subtitle="Remove all ads for a smooth experience"
                subtitleStyle={styles.subtitleStyle}
              />

              <SettingItem
                icon={<Exclusive />}
                title="Exclusive Customization"
                isSwitch={false}
                subtitle="Coming soon: Profile themes"
                subtitleStyle={styles.subtitleStyle}
              />
            </>
          )}

          {isBlahs && (
            <SettingItem
              icon={<BlahRecoveryBlack />}
              title="Blahs Recovery"
              isSwitch={false}
              subtitle={offerSubtitle ?? 'In 13h offer expire'}
              subtitleStyle={styles.subtitleStyle}
            />
          )}
        </View>

        <SubscriptionPlans
          onSelectPlan={handlePlanSelection}
          isBlahs={isBlahs}
          isPremium={isPremium}
        />

        <CustomButton
          style={styles.continueButton}
          onPress={onContinue}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </CustomButton>

        <Text style={styles.subscribe}>
          By tapping Subscribe, you agree to the Subscription Terms
        </Text>
      </View>
    </BottomModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    borderWidth: 0,
  },
  headerModal: {
    alignItems: 'center',
    marginTop: 37,
    marginBottom: 37,
  },
  title: {
    fontFamily: 'InterBold',
    fontSize: 25,
    color: '#FF325E',
    textAlign: 'center',
    marginTop: 8,
  },
  settingsContainer: {
    marginBottom: 20,
  },
  subtitleStyle: {
    fontSize: 15,
  },
  planContainer: {
    marginHorizontal: 30,
    marginBottom: 20,
  },
  planButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 40,
    paddingVertical: 12,
    marginBottom: 12,
  },
  planButtonText: {
    fontFamily: 'InterSemiBold',
    fontSize: 18,
    textAlign: 'center',
    color: '#000',
  },
  continueButton: {
    marginHorizontal: 30,
  },
  continueButtonText: {
    fontFamily: 'InterBold',
    fontSize: 26,
    color: '#fff',
  },
  subscribe: {
    fontSize: 12,
    fontFamily: 'InterRegular',
    color: '#B3B3B3',
    textAlign: 'center',
    paddingTop: 10,
    marginHorizontal: 30,
  },
});

export default PremiumModal;

import React from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';

interface WelcomeBackProps {
  username?: string;
}

const WelcomeBack: React.FC<WelcomeBackProps> = () => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        opacity.setValue(0);
      };
    }, [])
  );

  return (
    <View>
      <Text style={styles.welcomeText}>Hop back! Log in Now</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    paddingVertical: 20,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'InterBold',
    textAlign: 'center',
  },
});

export default WelcomeBack;

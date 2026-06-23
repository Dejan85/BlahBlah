import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

interface TypingIndicatorProps {
  username: string;
  isVisible: boolean;
  avatar?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  username,
  isVisible,
  avatar,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    if (isVisible) {
      // Fade in the indicator
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Animate dots
      const animateDots = () => {
        const animations = dotAnimations.map((anim, i) =>
          Animated.sequence([
            Animated.delay(i * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );

        Animated.loop(Animated.parallel(animations)).start();
      };

      animateDots();
    } else {
      // Fade out the indicator
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Reset dot animations
      dotAnimations.forEach((anim) => anim.setValue(0));
    }

    return () => {
      dotAnimations.forEach((anim) => anim.setValue(0));
    };
  }, [isVisible, fadeAnim, ...dotAnimations]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.typingIndicatorContainer, { opacity: fadeAnim }]}
    >
      <View style={styles.typingBubble}>
        {avatar && <Image source={{ uri: avatar }} style={styles.avatar} />}
        <View style={styles.contentContainer}>
          <Text style={styles.typingText}>{username} is typing</Text>
          <View style={styles.dotContainer}>
            {dotAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  typingIndicatorContainer: {
    padding: 8,
    marginLeft: 16,
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'InterMedium',
    marginRight: 8,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 2,
  },
});

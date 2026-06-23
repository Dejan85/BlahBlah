import { Block } from '@/assets/images';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const BlockBadge = () => (
  <View style={styles.container}>
    <Block width={30} height={30} />
    <Text style={styles.text}>This user is blocked</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 150,
  },
  text: {
    color: '#B3B3B3',
    fontSize: 18,
    fontFamily: 'InterRegular',
    paddingHorizontal: 130,
    textAlign: 'center',
    paddingVertical: 5,
  },
});

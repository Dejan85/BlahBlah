import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Back } from '@/assets/images';
import { IconButton } from './IconButton';

type HeaderProps = {
  title: string;
  onBackPress: () => void;
  onRightPress?: () => void;
};

const Header: React.FC<HeaderProps> = ({ title, onBackPress }) => {
  return (
    <>
      <StatusBar
        translucent
        backgroundColor="#FF325E"
        barStyle="light-content"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <IconButton icon={<Back />} onPress={onBackPress} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FF325E',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF325E',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'InterSemiBold',
    textAlign: 'center',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
});

export default Header;

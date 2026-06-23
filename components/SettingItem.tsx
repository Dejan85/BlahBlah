import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';

import { StatusBar } from 'react-native';

const SettingItem = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  isSwitch = true,
  style,
  subtitleStyle,
  numberOfLines,
  hasIcon,
  labelStyle,
}: {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  value?: boolean;
  isSwitch?: boolean;
  onValueChange?: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  hasIcon?: boolean;
}) => (
  <View style={[styles.settingItem, style]}>
    <View style={styles.settingLeft}>
      {hasIcon && <View>{icon}</View>}
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingLabel, labelStyle]}>{title}</Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, subtitleStyle]}
            numberOfLines={numberOfLines}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {isSwitch && (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#FF325E' }}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  closeButton: {
    position: 'absolute',
    left: 36,
    top: 36,
  },
  content: {
    flex: 1,
    marginTop: 45,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 45,
    marginBottom: 40,
  },
  profileImage: {
    width: 76,
    height: 76,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 1,
  },
  username: {
    fontSize: 18,
    fontFamily: 'InterBold',
    color: '#000',
  },
  settingsSection: {},
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 46,
    paddingRight: 37,
    paddingVertical: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'InterMedium',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 8,
    fontFamily: 'InterRegular',
    color: '#B3B3B3',
  },
  mediaSection: {},
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'InterMedium',
    color: '#000',
    paddingLeft: 10,
    paddingBottom: 5,
  },
  imageGrid: {
    flex: 1,

    margin: 2,
  },
  imageItem: {
    width: (Dimensions.get('window').width - 34) / 3,
    aspectRatio: 1,
    marginBottom: 2,
    marginRight: 2,
    borderRadius: 20,
  },
  chatImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

export default SettingItem;

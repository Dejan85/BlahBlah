import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

const Text: React.FC<TextProps> = ({
  variant = 'body',
  weight = 'regular',
  color,
  align,
  style,
  children,
  ...props
}) => {
  const textStyles: StyleProp<TextStyle> = [
    styles[variant],
    styles[weight],
    align !== undefined && { textAlign: align },
    color !== undefined && { color },
    style,
  ].filter(Boolean) as StyleProp<TextStyle>;

  return (
    <RNText {...props} style={textStyles}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    lineHeight: 40,
  } as TextStyle,
  h2: {
    fontSize: 28,
    lineHeight: 32,
  } as TextStyle,
  h3: {
    fontSize: 20,
    lineHeight: 28,
  } as TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,
  caption: {
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
  label: {
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
  regular: {
    fontFamily: 'InterRegular',
  } as TextStyle,
  medium: {
    fontFamily: 'InterMedium',
  } as TextStyle,
  semibold: {
    fontFamily: 'InterSemiBold',
  } as TextStyle,
  bold: {
    fontFamily: 'InterBold',
  } as TextStyle,
});

export default Text;

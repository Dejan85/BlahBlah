import React, { forwardRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextInputProps,
  TextStyle,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SvgProps } from "react-native-svg";

type CustomTextInputProps = {
  placeholder?: string;
  leftIcon?: React.ReactElement<SvgProps>;
  rightIcon?: React.ReactElement<SvgProps>;
  isPassword?: boolean;
  passwordVisible?: boolean;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  value?: string;
  style?: StyleProp<ViewStyle>;
  styleContainer?: StyleProp<ViewStyle>;
  placeholderTextColor?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
  selectionColor?: TextInputProps["selectionColor"];
  multiLine?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  textStyle?: StyleProp<TextStyle>;
  showBorderLeft?: boolean;
  keyboardVerticalOffset?: number;
  blurOnSubmit?: boolean;
  editable?: boolean;
  maxLength?: number;
};

const CustomTextInput = forwardRef<TextInput, CustomTextInputProps>(
  (
    {
      placeholder,
      leftIcon,
      rightIcon,
      isPassword = false,
      passwordVisible = false,
      onLeftIconPress,
      onRightIconPress,
      value,
      style,
      styleContainer,
      keyboardType,
      placeholderTextColor = "#999",
      onChangeText,
      secureTextEntry = false,
      autoCapitalize = "sentences",
      onSubmitEditing,
      returnKeyType = "done",
      selectionColor = "",
      multiLine = false,
      autoFocus = false,
      onBlur,
      textStyle,
      editable,
      showBorderLeft = false,
      keyboardVerticalOffset,
      blurOnSubmit,
      maxLength,
    },
    ref,
  ) => {
    const handleSubmitEditing = () => {
      if (!multiLine) {
        Keyboard.dismiss();
      }
      onSubmitEditing?.();
    };

    const handleBlur = () => {
      Keyboard.dismiss();
      onBlur?.();
    };

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.keyboardContainer, styleContainer]}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.container}>
          {leftIcon && (
            <TouchableOpacity
              onPress={onLeftIconPress}
              style={styles.iconContainer}
            >
              {leftIcon}
            </TouchableOpacity>
          )}
          {showBorderLeft && <View style={styles.borderLeft} />}
          <TextInput
            ref={ref}
            style={[styles.input, style, textStyle]}
            placeholder={placeholder}
            secureTextEntry={isPassword ? !passwordVisible : secureTextEntry}
            value={value}
            placeholderTextColor={placeholderTextColor}
            onChangeText={onChangeText}
            autoCapitalize={autoCapitalize}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType={returnKeyType}
            keyboardType={keyboardType}
            editable={editable}
            selectionColor={selectionColor}
            multiline={multiLine}
            autoFocus={autoFocus}
            onBlur={handleBlur}
            blurOnSubmit={blurOnSubmit}
            maxLength={maxLength}
          />
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.iconContainer}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  },
);

const styles = StyleSheet.create({
  keyboardContainer: {
    width: "100%",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  iconContainer: {
    paddingHorizontal: 12,
  },
  borderLeft: {
    width: 2,
    height: "50%",
    backgroundColor: "#EFEFEF",
    marginHorizontal: 8,
  },
});

export default CustomTextInput;

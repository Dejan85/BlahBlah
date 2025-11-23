// components/ui/CustomButton.tsx
import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  ActivityIndicator,
} from "react-native";
import CustomText from "./CustomText";

interface ButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

const CustomButton: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  isLoading = false,
  isDisabled = false,
  style,
  textStyle,
  children,
  ...props
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    isDisabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    isDisabled && styles.text_disabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      {...props}
      style={buttonStyles}
      disabled={isDisabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#FF325E" : "#ffffff"}
        />
      ) : (
        <>
          {leftIcon}
          {typeof children === "string" ? (
            <CustomText style={textStyles}>{children}</CustomText>
          ) : (
            children
          )}
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    gap: 8,
  },
  button_primary: {
    backgroundColor: "#FF325E",
  },
  button_secondary: {
    backgroundColor: "#333333",
  },
  button_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FF325E",
  },
  button_ghost: {
    backgroundColor: "transparent",
  },
  button_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: "InterBold",
  },
  text_primary: {
    color: "#ffffff",
  },
  text_secondary: {
    color: "#ffffff",
  },
  text_outline: {
    color: "#FF325E",
  },
  text_ghost: {
    color: "#FF325E",
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  text_disabled: {
    opacity: 0.5,
  },
});

export default CustomButton;

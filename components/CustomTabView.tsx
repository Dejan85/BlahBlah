// components/CustomTabView.tsx
import React, { useState, ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

type TabViewProps = {
  signInComponent: ReactNode;
  signUpComponent: ReactNode;
  initialTab?: "signin" | "signup";
};

const CustomTabView: React.FC<TabViewProps> = ({
  signInComponent,
  signUpComponent,
  initialTab = "signin",
}) => {
  const [selectedTab, setSelectedTab] = useState<"signin" | "signup">(
    initialTab,
  );

  const renderContent = () => {
    switch (selectedTab) {
      case "signin":
        return <View style={styles.contentContainer}>{signInComponent}</View>;
      case "signup":
        return <View style={styles.contentContainer}>{signUpComponent}</View>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabButtonsContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.tabButton,
            selectedTab === "signin" && styles.selectedTab,
            pressed && styles.pressed,
          ]}
          onPress={() => setSelectedTab("signin")}
        >
          <Text
            style={selectedTab === "signin" ? styles.selectedText : styles.text}
          >
            Login
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tabButton,
            selectedTab === "signup" && styles.selectedTab,
            pressed && styles.pressed,
          ]}
          onPress={() => setSelectedTab("signup")}
        >
          <Text
            style={selectedTab === "signup" ? styles.selectedText : styles.text}
          >
            Sign up
          </Text>
        </Pressable>
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabButtonsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 50,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 45,
  },
  selectedTab: {
    backgroundColor: "#fff",
  },
  pressed: {
    opacity: 0.8,
  },
  selectedText: {
    fontFamily: "InterSemiBold",
    fontSize: 14,
    color: "#000000",
  },
  text: {
    fontFamily: "InterSemiBold",
    fontSize: 14,
    color: "#B3B3B3",
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginTop: 20,
  },
});

export default CustomTabView;

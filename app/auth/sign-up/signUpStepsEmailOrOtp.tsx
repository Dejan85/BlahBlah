import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import SignUpSteps from "./signUpSteps"; // Import your email signup screen
import SignUpWithPhone from "./signUpWithOtp";
const SignUpStepsEmailOrOtp = () => {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

  return (
    <View style={styles.container}>
      {/* Tab Icons */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "email" && styles.activeTab]}
          onPress={() => setActiveTab("email")}
        >
          <FontAwesome
            name="envelope"
            size={30}
            color={activeTab === "email" ? "#fff" : "#B3B3B3"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "email" && styles.activeTabText,
            ]}
          >
            Email
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "phone" && styles.activeTab]}
          onPress={() => setActiveTab("phone")}
        >
          <FontAwesome
            name="phone"
            size={30}
            color={activeTab === "phone" ? "#fff" : "#B3B3B3"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "phone" && styles.activeTabText,
            ]}
          >
            Phone
          </Text>
        </Pressable>
      </View>

      {/* Render Content Based on Active Tab */}
      <View style={styles.content}>
        {activeTab === "email" ? <SignUpSteps /> : <SignUpWithPhone />}
      </View>
    </View>
  );
};

export default SignUpStepsEmailOrOtp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  tab: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    color: "#B3B3B3",
    fontFamily: "InterMedium",
    marginTop: 5,
  },
  activeTabText: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
});

import React from "react";
import { Text, StyleSheet } from "react-native";
import { formatPresence } from "@/hooks/usePresence";

interface UserPresenceProps {
  lastSeen: string | null;
  isOnline: boolean;
  style?: any;
}

export const UserPresence: React.FC<UserPresenceProps> = ({
  lastSeen,
  isOnline,
  style,
}) => {
  const presenceText = formatPresence(lastSeen, isOnline);

  return (
    <Text
      style={[styles.text, isOnline ? styles.online : styles.offline, style]}
    >
      {presenceText}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 10,
    fontFamily: "InterMedium",
    color: "#B3B3B3",
  },
  online: {
    color: "#4CAF50",
  },
  offline: {
    color: "#6C757D",
  },
});

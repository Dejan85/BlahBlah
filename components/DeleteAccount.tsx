import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

export const DeleteAccount = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);

      if (!session?.access_token) {
        throw new Error("No session found");
      }

      // Add an empty body to the request
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}), // Add this empty body
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      await signOut();
      Alert.alert(
        "Account Deleted",
        "Your account has been successfully deleted.",
        [
          {
            text: "OK",
            onPress: () => router.push("/"),
          },
        ],
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to delete account. Please try again.";

      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: handleDeleteAccount,
          style: "destructive",
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF325E" />
        </View>
      ) : (
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={isLoading}
          style={styles.deleteButton}
        >
          <Text style={styles.btnText}>Delete Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  btnText: {
    fontFamily: "InterSemibold",
    textAlign: "center",
    color: "#fff",
    paddingVertical: 8,
  },
  deleteButton: {
    backgroundColor: "#FF325E",
    borderRadius: 40,
    marginBottom: 12,
    marginHorizontal: 50,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useEffect } from "react";
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import { Group } from "@/assets/images";

export default function PermissionsScreen() {
  const router = useRouter();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      // Request location permission
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync().catch(() => ({
          status: "denied",
        }));

      // Request contacts permission
      const { status: contactsStatus } =
        await Contacts.requestPermissionsAsync().catch(() => ({
          status: "denied",
        }));
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  };

  const handleNext = () => {
    router.push("/auth/sign-up/profilePictureStep");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerText}>BlahBlah</Text>
        <Text style={styles.subtitleText}>
          Now you can enable your contacts and location, making it easier to
          discover friends
        </Text>
        <Text style={styles.subtitleText2}>
          If you give BlahBlah permission to access your contacts, you'll be
          able to find and connect with the people who matter most, while
          enjoying a more personalized experience
        </Text>
        <View style={styles.image}>
          <Group />
        </View>

        <Pressable style={styles.buttonContainer} onPress={handleNext}>
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FF325E",
  },
  container: {
    flex: 1,
    backgroundColor: "#FF325E",
    paddingHorizontal: 24,
  },
  image: {
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 70,
    marginBottom: 50,
  },
  headerText: {
    textAlign: "center",
    fontFamily: "InterBold",
    color: "#FFFFFF",
    fontSize: 28,
    marginTop: Platform.OS === "android" ? 60 : 20,
  },
  buttonContainer: {
    marginTop: 20,
    alignContent: "center",
    alignSelf: "center",
    borderRadius: 50,
    paddingVertical: 14,
    backgroundColor: "#fff",
    width: "90%",
  },
  btnText: {
    fontFamily: "InterSemiBold",
    fontSize: 18,
    color: "#000",
    textAlign: "center",
  },
  subtitleText: {
    fontFamily: "InterBold",
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 60,
  },
  subtitleText2: {
    fontFamily: "InterMedium",
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 60,
  },
});

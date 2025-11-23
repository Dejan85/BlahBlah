import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Text,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { Entypo } from "@expo/vector-icons";

const DatePickerScreen = () => {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const router = useRouter();

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    setDate(currentDate);
  };

  const handleNext = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({
          birthday: date.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      router.push("/auth/sign-up/username");
    } catch (error) {
      console.error("Error saving date:", error);
      Alert.alert("Error", "Failed to save birthday");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Birthday date?{"\n"}
        Your friends need a reason to party help them out!{" "}
        <Entypo name="cake" size={16} color={"#fff"} style={styles.icon} />
      </Text>

      <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
      </Pressable>

      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            style={styles.datePicker}
            textColor="#000"
          />
        </View>
      )}

      <Pressable style={styles.buttonContainer} onPress={handleNext}>
        <Text style={styles.btnText}>Continue</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF325E",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
    marginBottom: 20,
    paddingHorizontal: 87,
  },
  icon: {
    paddingLeft: 3,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 20,
    ...(Platform.OS === "ios" && {
      paddingVertical: 20,
    }),
  },
  datePicker: {
    height: 210,
    ...(Platform.OS === "ios" && {
      width: "100%",
      borderRadius: 0,
    }),
  },
  dateButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 50,
    marginVertical: 20,
    alignItems: "center",
  },
  dateButtonText: {
    fontFamily: "InterMedium",
    fontSize: 16,
    color: "#000",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 60, // Distance from the bottom
    left: 0, // Start at the left edge
    right: 0, // End at the right edge
    alignItems: "center", // Center child content horizontally
  },
  btnText: {
    fontFamily: "InterSemiBold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  line: {
    width: "100%",
    height: 2,
    backgroundColor: "#fff",
    marginBottom: 34,
  },
});

export default DatePickerScreen;

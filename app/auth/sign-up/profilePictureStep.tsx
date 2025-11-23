import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Group } from "@/assets/images";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase";

export default function ProfilePictureScreen() {
  const router = useRouter();
  const { updateAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const uploadImage = async (imageUri: string) => {
    try {
      const arrayBuffer = await fetch(imageUri).then((res) =>
        res.arrayBuffer(),
      );
      const fileExt = imageUri.split(".").pop()?.toLowerCase() ?? "jpeg";
      const path = `${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, {
          contentType: "image/jpeg",
          cacheControl: "2592000", // 30 days cache
          upsert: true,
        });

      if (uploadError) throw uploadError;

      await updateAvatar(data.path);
      setIsUploaded(true);

      Alert.alert("Success", "Profile picture uploaded successfully!");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
      throw error;
    }
  };

  const handleImagePicker = async (type: "camera" | "library") => {
    try {
      setUploading(true);

      // Request permission based on type
      if (type === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Camera permission is required to take photos.",
          );
          return;
        }
      }

      const result = await (type === "camera"
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
            exif: false,
          }));

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const image = result.assets[0];
      if (!image.uri) throw new Error("No image URI!");

      // Set the selected image immediately for preview
      setSelectedImage(image.uri);

      await uploadImage(image.uri);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>BlahBlah</Text>
      <Text style={styles.subtitleText}>Add a profile picture</Text>
      <Text style={styles.subtitleText2}>
        Add a profile picture to make it easier for your friends to spot you
      </Text>

      <View style={styles.imageContainer}>
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <Group />
        )}
      </View>

      {isUploaded ? (
        <Pressable style={styles.buttonContainer} onPress={handleNext}>
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
      ) : (
        <View style={styles.buttonGroup}>
          <Pressable
            style={[styles.buttonContainer, styles.buttonHalf]}
            onPress={() => handleImagePicker("camera")}
            disabled={uploading}
          >
            <Text style={styles.btnText}>
              {uploading ? "Uploading..." : "Camera"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.buttonContainer, styles.buttonHalf]}
            onPress={() => handleImagePicker("library")}
            disabled={uploading}
          >
            <Text style={styles.btnText}>
              {uploading ? "Uploading..." : "Gallery"}
            </Text>
          </Pressable>
        </View>
      )}

      <Text onPress={handleNext} style={styles.skipText}>
        Skip
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF325E",
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 70,
    marginBottom: 50,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#fff",
  },
  buttonGroup: {
    flexDirection: "column",
    paddingVertical: 10,
  },
  buttonHalf: {},
  skipText: {
    fontSize: 18,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
    marginTop: 20,
    marginBottom: 10,
  },
  headerText: {
    textAlign: "center",
    fontFamily: "InterBold",
    color: "#FFFFFF",
    fontSize: 28,
    marginTop: 60,
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

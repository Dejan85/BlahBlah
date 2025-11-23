import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import * as FileSystem from "expo-file-system";

type MessageType = "text" | "audio" | "image" | "file";

interface MediaSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMediaSelect: (uri: string, type: MessageType) => Promise<void>;
}

const MediaSelector: React.FC<MediaSelectorProps> = ({
  visible,
  onClose,
  onMediaSelect,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadToSupabase = async (
    fileUri: string,
    folder: "images" | "documents",
  ) => {
    try {
      // Read the file
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!fileContent) {
        throw new Error("No content provided");
      }

      // Generate unique filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const fileExt = fileUri.split(".").pop();
      const filePath = `${folder}/${filename}.${fileExt}`;

      // Convert base64 to blob
      const base64Data = fileContent;
      const contentType =
        folder === "images" ? "image/jpeg" : "application/octet-stream";

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(filePath, decode(base64Data), {
          contentType,
          upsert: true,
          cacheControl: "3600",
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading to Supabase:", error);
      throw error;
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        try {
          const uploadedUrl = await uploadToSupabase(
            result.assets[0].uri,
            "images",
          );
          await onMediaSelect(uploadedUrl, "image");
          onClose();
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert("Error", "Failed to upload image. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setIsUploading(true);
        try {
          const uploadedUrl = await uploadToSupabase(
            result.assets[0].uri,
            "documents",
          );
          await onMediaSelect(uploadedUrl, "file");
          onClose();
        } catch (error) {
          console.error("Error uploading document:", error);
          Alert.alert("Error", "Failed to upload document. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          {isUploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF325E" />
              <Text style={styles.loadingText}>Uploading...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              <TouchableOpacity
                style={styles.option}
                onPress={handleImagePicker}
              >
                <Ionicons name="images-outline" size={24} color="#000" />
                <Text style={styles.optionText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={handleDocumentPicker}
              >
                <Ionicons name="document-outline" size={24} color="#000" />
                <Text style={styles.optionText}>Upload Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  content: {
    padding: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: "InterRegular",
    color: "#000",
  },
  cancelButton: {
    justifyContent: "center",
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelText: {
    color: "#FF325E",
    fontSize: 16,
    fontFamily: "InterMedium",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "InterMedium",
    color: "#000",
  },
});

export default MediaSelector;

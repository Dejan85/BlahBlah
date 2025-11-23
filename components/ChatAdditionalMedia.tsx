import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import {
  Block,
  Hours24,
  MuteAction,
  NoBlahs,
  PinAction,
  ProfileBackButton,
} from "@/assets/images";
import { StatusBar } from "react-native";
import SettingItem from "./SettingItem";
import ImageViewer from "./Chat/ImageViewer";

const WINDOW_WIDTH = Dimensions.get("window").width;
const IMAGE_MARGIN = 0;
const NUM_COLUMNS = 3;
const IMAGE_SIZE =
  (WINDOW_WIDTH - (NUM_COLUMNS + 1) * IMAGE_MARGIN) / NUM_COLUMNS;

interface ProfileOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  avatar: string;
  chatImages: string[];
}

const ImageGridItem: React.FC<{ uri: string }> = ({ uri }) => {
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.imageItem}
        onPress={() => setIsViewerVisible(true)}
        activeOpacity={0.8}
      >
        <Image source={uri} style={styles.chatImage} contentFit="cover" />
      </TouchableOpacity>

      <ImageViewer
        isVisible={isViewerVisible}
        imageUrl={uri}
        onClose={() => setIsViewerVisible(false)}
      />
    </>
  );
};

const ProfileOptionsModal: React.FC<ProfileOptionsModalProps> = ({
  visible,
  onClose,
  username,
  avatar,
  chatImages = [],
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isNoBlahs, setIsNoBlahs] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const renderImageItem = ({ item }: { item: string }) => (
    <ImageGridItem uri={item} />
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ProfileBackButton fill={"#000"} />
          </TouchableOpacity>

          <View style={styles.profileSection}>
            <Image
              source={avatar}
              style={styles.profileImage}
              contentFit="cover"
            />
            <Text style={styles.username}>{username}</Text>
          </View>

          <View style={styles.settingsSection}>
            <SettingItem
              icon={<PinAction />}
              title="Pin to top"
              value={isPinned}
              onValueChange={setIsPinned}
            />
            <SettingItem
              icon={<MuteAction />}
              title="Mute Notifications"
              value={isMuted}
              onValueChange={setIsMuted}
            />
            <SettingItem
              icon={<NoBlahs />}
              title="No Blahs"
              subtitle="They won't receive your daily Blahs"
              value={isNoBlahs}
              onValueChange={setIsNoBlahs}
            />
            <SettingItem
              icon={<Block />}
              title="Block"
              value={isBlocked}
              onValueChange={setIsBlocked}
            />
            <SettingItem
              icon={<Hours24 />}
              title="Save Chat"
              subtitle="Chat will be deleted after 30days not 24hours"
              value={isSaved}
              onValueChange={setIsSaved}
            />
          </View>

          {chatImages.length > 0 && (
            <View style={styles.mediaSection}>
              <Text style={styles.sectionTitle}>Media</Text>
              <View style={styles.imageGrid}>
                <FlashList
                  data={chatImages}
                  renderItem={renderImageItem}
                  estimatedItemSize={IMAGE_SIZE}
                  numColumns={NUM_COLUMNS}
                  keyExtractor={(item, index) => index.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: IMAGE_MARGIN }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  closeButton: {
    position: "absolute",
    left: 36,
    top: 36,
  },
  content: {
    flex: 1,
    marginTop: 45,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 45,
    marginBottom: 40,
  },
  profileImage: {
    width: 76,
    height: 76,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 1,
  },
  username: {
    fontSize: 18,
    fontFamily: "InterBold",
    color: "#000",
  },
  settingsSection: {
    marginBottom: 20,
  },
  mediaSection: {
    paddingHorizontal: IMAGE_MARGIN,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "InterMedium",
    color: "#000",
    paddingLeft: 10,
    paddingBottom: 10,
  },
  imageGrid: {
    width: WINDOW_WIDTH,
    minHeight: IMAGE_SIZE,
  },
  imageItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: IMAGE_MARGIN,
    borderRadius: 10,
    overflow: "hidden",
  },
  chatImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
});

export default ProfileOptionsModal;

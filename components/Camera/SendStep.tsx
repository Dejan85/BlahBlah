import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { CameraContext } from '@/context/CameraContext';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
} from '@shopify/react-native-skia';
import { getFilterMatrixByName } from '@/types/filter';
import {
  Music,
  NoComments,
  NoLikes,
  NoShares,
  ProfileBackButton,
  RedBunny,
  SendGallery,
} from '@/assets/images';
import SettingItem from '../SettingItem';
import { Ionicons } from '@expo/vector-icons';
import PremiumModal from '../PremiumModal';
import { usePremium } from '@/context/PremiumContext';
import { usePost } from '@/context/PostContext';
import type { CreatePostData } from '@/context/PostContext'; // Import CreatePostData type

interface Post {
  comment: string;
  additionalMedia: { uri: string; type: 'image' | 'video' }[];
  mentions: string[];
  hashtags: string[];
}

function FilteredImage({
  uri,
  filterMatrix,
}: {
  uri: string;
  filterMatrix: number[];
}) {
  const skiaImage = useImage(uri);

  if (!skiaImage) return null;

  return (
    <Canvas style={styles.mediaPreview}>
      <SkiaImage image={skiaImage} width={269} height={269} fit="cover">
        <ColorMatrix matrix={filterMatrix} />
      </SkiaImage>
    </Canvas>
  );
}

export const SendStep = ({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (post: Post) => void;
}) => {
  const { capturedPhoto, video, selectedFilter, setStep, setCapturedPhoto } =
    useContext(CameraContext);
  // Blah+ gating (T3.20): "Lock Post" je premium pogodnost (Camera 4.6).
  const { canAccess, purchase } = usePremium();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const filterMatrix = getFilterMatrixByName(selectedFilter);
  const [currentPage, setCurrentPage] = useState(0);
  const { isUploading, uploadProgress, createPost } = usePost();
  const [postDetails, setPostDetails] = useState<Post>({
    comment: '',
    additionalMedia: [],
    mentions: [],
    hashtags: [],
  });

  const [hideLikes, setHideLikes] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [hideShares, setHideShares] = useState(false);
  const [lockPost, setLockPost] = useState(false);

  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Paywall Continue (Camera 4.6) → kupovina pretplate (stub naplata, T3.20).
  const handleContinue = async (plan: 'monthly' | 'yearly' | 'onetime') => {
    if (plan === 'onetime') return; // recovery ne ide kroz ovaj paywall
    const result = await purchase(plan);
    setShowPremiumModal(false);
    if (result.success) {
      setLockPost(true); // korisnik je hteo Lock Post → uključi posle kupovine
      Alert.alert('Blah +', 'Welcome to Blah +!');
    } else if (!result.cancelled && result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleSubmit = async () => {
    try {
      const mediaType = video ? ('video' as const) : ('image' as const);

      const postData: CreatePostData = {
        mediaType,
        mainMediaUri: video?.uri || capturedPhoto?.uri,
        additionalMedia: postDetails.additionalMedia,
        comment: postDetails.comment,
        mentions: postDetails.mentions,
        hashtags: postDetails.hashtags,
        hideLikes,
        hideComments,
        hideShares,
        isLocked: lockPost,
        filterApplied: selectedFilter,
      };

      const result = await createPost(postData);

      if (!result.success) {
        throw new Error(result.error);
      }

      onSubmit(postDetails);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.', [
        { text: 'OK' },
      ]);
    }
  };

  // Modify the lock post toggle handler
  const handleLockPostToggle = useCallback(
    (value: boolean) => {
      if (value && !canAccess('lock_posts')) {
        setShowPremiumModal(true);
        return;
      }
      setLockPost(value);
    },
    [canAccess]
  );

  const allMedia = capturedPhoto?.uri
    ? [
        { uri: capturedPhoto.uri, type: 'image' as const, isMain: true },
        ...postDetails.additionalMedia.map((media) => ({
          ...media,
          isMain: false,
        })),
      ]
    : [];

  const handleMediaTap = (index: number) => {
    const selectedMedia = allMedia[index];
    setCapturedPhoto({ uri: selectedMedia.uri });
    setStep('preview');
  };

  const handleDeleteImage = (index: number) => {
    if (index === 0 && allMedia.length > 1) {
      // If deleting main photo, replace it with first additional media
      const newAdditionalMedia = [...postDetails.additionalMedia];
      newAdditionalMedia.shift();
      setPostDetails((prev) => ({
        ...prev,
        additionalMedia: newAdditionalMedia,
      }));
    } else if (index === 0) {
      // If it's the only photo, go back
      Alert.alert(
        'Delete Photo',
        'Do you want to delete this photo and go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => setStep('capture'),
          },
        ]
      );
    } else {
      // Delete from additional media
      setPostDetails((prev) => ({
        ...prev,
        additionalMedia: prev.additionalMedia.filter((_, i) => i !== index - 1),
      }));
    }
  };

  const addPhotos = async () => {
    // Count includes main photo from previous step
    const currentPhotoCount = 1 + postDetails.additionalMedia.length;

    if (currentPhotoCount >= 3) {
      Alert.alert(
        'Limit Reached',
        'You can only add up to 2 additional photos.'
      );
      return;
    }

    const remainingSlots = 3 - currentPhotoCount;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newMedia = result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image' as const,
      }));

      setPostDetails((prev) => ({
        ...prev,
        additionalMedia: [...prev.additionalMedia, ...newMedia].slice(0, 2), // Ensure max 3 including main photo
      }));
    }
  };

  const renderMedia = () => {
    if (video) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.mediaWrapper}>
            <TouchableOpacity
              onPress={() => setIsVideoPlaying(!isVideoPlaying)}
            >
              <Video
                source={{ uri: video.uri }}
                style={styles.mediaPreview}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isVideoPlaying}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Delete Video',
                  'Do you want to delete this video and go back?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => setStep('capture'),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (allMedia.length === 0) return null;

    return (
      <ScrollView
        style={styles.mediaContainer}
        scrollEnabled
        contentContainerStyle={styles.scrollContent}
      >
        <PagerView
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {allMedia.map((media, index) => (
            <View key={index} style={styles.pageContainer}>
              <TouchableOpacity
                style={styles.mediaWrapper}
                onPress={() => handleMediaTap(index)}
                activeOpacity={0.9}
              >
                {filterMatrix && selectedFilter !== 'Normal' ? (
                  <FilteredImage uri={media.uri} filterMatrix={filterMatrix} />
                ) : (
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaPreview}
                  />
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteImage(index)}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
        </PagerView>

        {allMedia.length > 1 && (
          <View style={styles.pagination}>
            {allMedia.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentPage && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ProfileBackButton fill={'#111'} />
          </TouchableOpacity>
        </View>

        {renderMedia()}

        {/* <CommentSection
          value={postDetails.comment}
          onChange={handleCommentChange}
          onSubmit={() => onSubmit(postDetails)}
        /> */}

        <TouchableOpacity style={styles.sendButton}>
          <Music />
          <Text style={styles.addPhotosText}>Add music</Text>
        </TouchableOpacity>

        {!video && (
          <TouchableOpacity style={styles.sendButton} onPress={addPhotos}>
            <SendGallery />
            <Text style={styles.addPhotosText}>
              {postDetails.additionalMedia.length > 0
                ? `${postDetails.additionalMedia.length + 1} Photos`
                : '1 Photo'}
            </Text>
          </TouchableOpacity>
        )}

        <SettingItem
          value={lockPost}
          title="Lock Post"
          onValueChange={handleLockPostToggle} // Use the new handler
          subtitle="Post remain visible even after 24 hours (3 posts max)"
          icon={<RedBunny width={26} height={26} />}
          style={styles.settings}
          subtitleStyle={{ fontSize: 7 }}
        />

        <SettingItem
          value={hideLikes}
          title="Hide Likes"
          onValueChange={setHideLikes}
          icon={<NoLikes />}
          style={styles.settings}
        />
        <SettingItem
          value={hideShares}
          title="Hide Shares"
          onValueChange={setHideShares}
          icon={<NoShares />}
          style={styles.settings}
        />
        <SettingItem
          value={hideComments}
          title="Hide Comments"
          onValueChange={setHideComments}
          icon={<NoComments />}
          style={styles.settings}
        />

        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color="#FF325E" />
            <Text style={styles.uploadingText}>
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Post</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <PremiumModal
        isVisible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onContinue={handleContinue}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  uploadingText: {
    marginLeft: 10,
    color: '#FF325E',
    fontSize: 16,
    fontFamily: 'InterMedium',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  mediaContainer: {
    height: 269,
    marginBottom: 20,
    ...Platform.select({
      android: {
        height: 280, // Slightly larger on Android to accommodate PagerView
      },
    }),
  },
  pagerView: {
    height: 269,
    ...Platform.select({
      android: {
        height: 280,
      },
    }),
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrapper: {
    position: 'relative',
    width: 269,
    height: 269,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  mediaPreview: {
    width: 269,
    height: 269,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  pagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'red',
    overflow: 'hidden',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#FF325E',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 10,
  },
  commentSection: {
    padding: 15,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    padding: 10,
    marginBottom: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 37,
    fontSize: 16,
    paddingRight: 30,
    color: '#111',
  },
  editPencil: {
    position: 'absolute',
    right: 10,
  },
  commentPreview: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111',
  },
  mentionText: {
    color: '#FF325E',
    fontFamily: 'InterSemiBold',
  },
  hashtagText: {
    color: '#0095F6',
    fontFamily: 'InterSemiBold',
  },
  seeMoreText: {
    color: '#888',
    marginTop: 5,
    fontSize: 14,
    fontFamily: 'InterMedium',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  suggestionsText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'InterRegular',
  },
  sendButton: {
    flexDirection: 'row',
    marginLeft: 24,
    marginVertical: 10,
  },
  addPhotosText: {
    fontSize: 15,
    color: '#111',
    fontFamily: 'InterMedium',
    paddingLeft: 18,
  },
  settings: {
    paddingLeft: 23,
    paddingRight: 24,
    paddingVertical: 10,
  },
  buttonContainer: {
    marginVertical: 40,
  },

  nextButton: {
    backgroundColor: '#FF325E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    alignSelf: 'flex-end',
    right: 24,
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 23,
    fontFamily: 'InterBold',
    paddingHorizontal: 35,
    paddingVertical: 8,
  },
});

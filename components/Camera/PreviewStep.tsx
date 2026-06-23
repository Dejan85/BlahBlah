// PreviewStep.tsx
import React, { useContext, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AntDesign } from '@expo/vector-icons';
import { Back, Download, Filter, FullScreen, SendChat } from '@/assets/images';
import {
  Canvas,
  Image as SkiaImage,
  ColorMatrix,
  useImage,
} from '@shopify/react-native-skia';
import { CameraContext } from '@/context/CameraContext';
import { getFilterMatrixByName } from '@/types/filter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useMessage } from '@/context/MessageContext';
import { FilterCarousel } from './FilterMenu';

import ResizablePhoto from '../ResizePhoto';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PreviewStepProps {
  videoRef: React.RefObject<Video>;
  handlePlayPause: () => void;
  handleDownload: () => Promise<void>;
  setIsFilterMenuVisible: (visible: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  capturedPhoto: any;
  video: { uri: string } | null;
  setStatus: (status: AVPlaybackStatus) => void;
}

function FilteredImage({
  uri,
  filterMatrix,
}: {
  uri: string;
  filterMatrix: number[];
}) {
  const skiaImage = useImage(uri);

  if (!skiaImage) {
    return null;
  }

  return (
    <Canvas style={{ width: screenWidth, height: screenHeight }}>
      <SkiaImage
        image={skiaImage}
        width={screenWidth}
        height={screenHeight}
        fit="cover"
      >
        <ColorMatrix matrix={filterMatrix} />
      </SkiaImage>
    </Canvas>
  );
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  videoRef,
  handlePlayPause,
  handleDownload,

  onNext,
  capturedPhoto,
  video,
  setStatus,
}) => {
  const {
    selectedFilter,
    setCapturedPhoto,
    setVideo,
    setStep,
    setSelectedFilter,
  } = useContext(CameraContext);
  const filterMatrix = getFilterMatrixByName(selectedFilter);
  const router = useRouter();
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [isResizeModalVisible, setIsResizeModalVisible] = useState(false);

  const { from, conversationId } = useLocalSearchParams<{
    from?: string;
    conversationId?: string;
  }>();

  const handleBack = () => {
    setSelectedFilter('Normal'); // Reset filter when going back
    setStep('capture');
  };

  const handleFilterToggle = () => {
    setIsFilterMenuVisible(!isFilterMenuVisible);
  };

  const handleFilterApply = () => {
    // The filter is already applied through the context, just close the menu
    setIsFilterMenuVisible(false);
  };

  const handleFilterCancel = () => {
    setIsFilterMenuVisible(false);
  };

  const { user } = useAuth();
  const { sendMessage } = useMessage();

  const handleSendToChat = async () => {
    try {
      if (!conversationId || !user?.id) {
        console.warn('Missing conversationId or userId');
        return;
      }

      // If it’s a photo, messageType = "image"
      // If it’s a video, you might do messageType = "file" (or add "video" in your context)
      const isPhoto = Boolean(capturedPhoto?.uri);
      const mediaUri = isPhoto ? capturedPhoto.uri : video?.uri;

      if (!mediaUri) {
        console.warn('No media found to send');
        return;
      }

      const messageType = isPhoto ? 'image' : 'file'; // or "video" if you add that

      // Actually send the message using the context
      await sendMessage(mediaUri, conversationId, user.id, messageType);
      setCapturedPhoto(null);
      setVideo(null);
      setStep('capture');
      // Then go back to chat screen
      router.back();
    } catch (error) {
      console.error('Failed to send to chat:', error);
    }
  };

  return (
    <View style={styles.previewContainer}>
      {capturedPhoto &&
        !video &&
        (filterMatrix && selectedFilter !== 'Normal' ? (
          <FilteredImage uri={capturedPhoto.uri} filterMatrix={filterMatrix} />
        ) : (
          <Image source={{ uri: capturedPhoto.uri }} style={styles.preview} />
        ))}

      {video && (
        <TouchableWithoutFeedback onPress={handlePlayPause}>
          <Video
            ref={videoRef}
            source={{ uri: video.uri }}
            isLooping
            style={styles.fullScreenMedia}
            resizeMode={ResizeMode.COVER}
            onPlaybackStatusUpdate={setStatus}
            useNativeControls={false}
          />
        </TouchableWithoutFeedback>
      )}

      <TouchableOpacity
        style={styles.previewButtonContainer}
        onPress={handleBack}
      >
        <Back />
      </TouchableOpacity>

      {capturedPhoto && (
        <>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleFilterToggle}
          >
            <Filter />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fullScreenButton}
            onPress={() => setIsResizeModalVisible(true)}
          >
            <FullScreen />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
        <Download />
      </TouchableOpacity>

      {from === 'chat' ? (
        <TouchableOpacity style={styles.nextButton} onPress={handleSendToChat}>
          <SendChat fill="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextText}>Next</Text>
          <AntDesign
            name="right"
            size={20}
            color="white"
            style={styles.right}
          />
        </TouchableOpacity>
      )}

      {capturedPhoto && (
        <FilterCarousel
          isVisible={isFilterMenuVisible}
          onClose={handleFilterCancel}
          onApply={handleFilterApply}
        />
      )}

      {/* {capturedPhoto && (
        <ImageResizeModal
          isVisible={isResizeModalVisible}
          onClose={() => setIsResizeModalVisible(false)}
          imageUri={capturedPhoto.uri}
        />
      )} */}
      {capturedPhoto && (
        <ResizablePhoto
          isVisible={isResizeModalVisible}
          onClose={() => setIsResizeModalVisible(false)}
          imageUri={capturedPhoto.uri}
          filterMatrix={filterMatrix}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  sendButton: {},
  preview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
  },
  previewButtonContainer: {
    position: 'absolute',
    top: 54,
    left: 30,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    opacity: 0.5,
    width: 40,
    height: 40,
  },
  filterButton: {
    position: 'absolute',
    top: 50,
    right: 130,
    backgroundColor: '#000',
    opacity: 0.5,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  fullScreenButton: {
    position: 'absolute',
    top: 50,
    right: 80,
    backgroundColor: '#000',
    opacity: 0.5,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  downloadButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    backgroundColor: '#000',
    opacity: 0.5,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  nextButton: {
    position: 'absolute',
    bottom: 45,
    backgroundColor: '#FF325E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    alignSelf: 'center',
    right: 38,
    flexDirection: 'row',
  },
  nextText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'InterBold',
    paddingLeft: 18,
    paddingVertical: 6,
  },
  right: {
    paddingRight: 18,
    paddingLeft: 5,
  },
});

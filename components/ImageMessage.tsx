// components/ImageMessage.tsx
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import ImageViewer from '@/components/Chat/ImageViewer';

interface ImageMessageProps {
  uri: string;
  isSender: boolean;
  style?: any;
}

const ImageMessage: React.FC<ImageMessageProps> = ({
  uri,
  isSender,
  style,
}) => {
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isSender ? styles.senderContainer : styles.receiverContainer,
          style,
        ]}
        onPress={() => setIsViewerVisible(true)}
      >
        <Image source={uri} style={styles.image} contentFit="cover" />
      </TouchableOpacity>

      <ImageViewer
        isVisible={isViewerVisible}
        imageUrl={uri}
        onClose={() => setIsViewerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 240,
    borderRadius: 12,
    overflow: 'hidden',
    margin: 2,
  },
  senderContainer: {
    alignSelf: 'flex-end',
    marginLeft: 50,
  },
  receiverContainer: {
    alignSelf: 'flex-start',
    marginRight: 50,
  },
  image: {
    width: 240,
    height: 320,
    backgroundColor: '#f0f0f0',
  },
});

export default ImageMessage;

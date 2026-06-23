import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface DocumentMessageProps {
  uri: string;
  isSender: boolean;
  style?: any;
}

const DocumentMessage: React.FC<DocumentMessageProps> = ({
  uri,
  isSender,
  style,
}) => {
  // Extract filename from URI
  const fileName = uri.split('/').pop() || 'File';

  // Get file extension
  const fileExt = fileName.split('.').pop()?.toUpperCase() || '';

  const handlePress = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, open in new tab
        await Linking.openURL(uri);
      } else {
        // Validate if URI is accessible
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await Sharing.shareAsync(uri);
        } else {
          console.log('File not found locally, attempting to download...');

          // If file doesn't exist locally, download it first
          const localUri = FileSystem.documentDirectory + fileName;
          const downloadResumable = FileSystem.createDownloadResumable(
            uri,
            localUri,
            {}
          );

          const downloadResult = await downloadResumable.downloadAsync();
          if (downloadResult?.uri) {
            console.log('File downloaded to:', downloadResult.uri);
            await Sharing.shareAsync(downloadResult.uri);
          } else {
            throw new Error('Failed to download file');
          }
        }
      }
    } catch (error) {
      console.error('Error handling document:', error);
      Alert.alert('Error', 'Failed to open document. Please try again.', [
        { text: 'OK' },
      ]);
    }
  };

  const getFileIcon = () => {
    switch (fileExt) {
      case 'PDF':
        return 'document-text-outline';
      case 'DOC':
      case 'DOCX':
        return 'document-text-outline';
      case 'XLS':
      case 'XLSX':
        return 'document-outline';
      case 'PPT':
      case 'PPTX':
        return 'document-outline';
      case 'ZIP':
      case 'RAR':
        return 'archive-outline';
      default:
        return 'document-outline';
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Check before processing
  if (!isValidUrl(uri)) {
    console.error('Invalid file URL:', uri);
    Alert.alert('Invalid File', 'The document URL is not valid.');
    return;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        isSender ? styles.senderContainer : styles.recipientContainer,
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getFileIcon()}
          size={24}
          color={isSender ? '#fff' : '#000'}
        />
        <Text
          style={[
            styles.fileType,
            isSender ? styles.senderText : styles.recipientText,
          ]}
        >
          {fileExt}
        </Text>
      </View>

      <View style={styles.fileInfo}>
        <Text
          style={[
            styles.fileName,
            isSender ? styles.senderText : styles.recipientText,
          ]}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <Text
          style={[
            styles.tapToOpen,
            isSender ? styles.senderText : styles.recipientText,
          ]}
        >
          Tap to open
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    maxWidth: 280,
    minWidth: 200,
    alignItems: 'center',
    marginVertical: 2,
  },
  senderContainer: {
    backgroundColor: '#FF325E',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  recipientContainer: {
    backgroundColor: '#E5E5E5',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'InterMedium',
    marginBottom: 4,
  },
  fileType: {
    fontSize: 10,
    fontFamily: 'InterRegular',
    marginTop: 4,
  },
  tapToOpen: {
    fontSize: 12,
    fontFamily: 'InterRegular',
    opacity: 0.7,
  },
  senderText: {
    color: '#fff',
  },
  recipientText: {
    color: '#000',
  },
});

export default DocumentMessage;

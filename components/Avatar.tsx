import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import {
  StyleSheet,
  View,
  Alert,
  Image,
  Button,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  size: number;
  url: string | null;
  onUpload?: (filePath: string) => void;
  style?: StyleProp<ViewStyle>;
}

export default function Avatar({ url, size = 150, onUpload, style }: Props) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const avatarSize = { height: size, width: size };

  useEffect(() => {
    if (url) {
      if (isExternalUrl(url)) {
        setAvatarUrl(url);
      } else {
        getPublicUrlImage(url);
      }
    }
  }, [url]);

  function isExternalUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  function getPublicUrlImage(path: string) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    if (data) {
      setAvatarUrl(data.publicUrl);
    } else {
      console.log('Error fetching public URL');
      setAvatarUrl(null);
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant permission to access your photos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 1,
        exif: false,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      if (!image.uri) {
        throw new Error('No image uri!');
      }

      if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Please select an image under 5MB');
        return;
      }

      const arraybuffer = await fetch(image.uri).then((res) =>
        res.arrayBuffer()
      );

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
          cacheControl: '2592000',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      if (onUpload && data) {
        const publicUrl = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        if (publicUrl.data) {
          onUpload(publicUrl.data.publicUrl);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Upload failed', error.message);
      } else {
        Alert.alert('Upload failed', 'An unexpected error occurred');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={style}>
      {uploading ? (
        <View style={[avatarSize, styles.avatar, styles.loadingContainer]}>
          <ActivityIndicator size="small" color="#FF325E" />
        </View>
      ) : avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarSize, styles.avatar, styles.image]}
          onError={() => {
            setAvatarUrl(null);
          }}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]} />
      )}
      {onUpload && (
        <View style={styles.uploadButtonContainer}>
          <Button
            title={uploading ? 'Uploading...' : 'Change Photo'}
            onPress={uploadAvatar}
            disabled={uploading}
            color="#FF325E"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 30,
    overflow: 'hidden',
    maxWidth: '100%',
    backgroundColor: '#F0F0F0',
  },
  image: {
    objectFit: 'cover',
    paddingTop: 0,
  },
  noImage: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E0E0E0',
    borderRadius: 30,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  uploadButtonContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
});

// components/ImageMessage.tsx
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from '@/components/Chat/ImageViewer';
import {
  getTapToViewState,
  canOpenTapToView,
  tapToViewLabel,
} from '@/lib/tapToView';

interface ImageMessageProps {
  uri: string;
  isSender: boolean;
  // Trenutak otvaranja (messages.opened_at). null/undefined → još "Tap to View".
  openedAt?: string | null;
  // Poziva se kad primalac prvi put tapne da pogleda (markira opened + persist).
  onOpen?: () => void;
  style?: any;
}

// "Tap to View" media (T3.15): slika se NE prikazuje inline. Primalac vidi placeholder
// "Tap to View", tapne da pogleda JEDNOM (otvara full-screen viewer), pa pređe u "Opened"
// (sivo) i ne može ponovo. Pošiljalac vidi status ("Delivered" → "Opened") i ne otvara.
const ImageMessage: React.FC<ImageMessageProps> = ({
  uri,
  isSender,
  openedAt,
  onOpen,
  style,
}) => {
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  const state = getTapToViewState(openedAt);
  const canOpen = canOpenTapToView({ isSender, openedAt });
  const label = tapToViewLabel(state, isSender);

  const handlePress = () => {
    if (!canOpen) return; // već otvoreno ili pošiljalac → nije ponovo dostupno
    onOpen?.();
    setIsViewerVisible(true);
  };

  const active = canOpen; // jedino "Tap to View" za primaoca je naglašeno
  const iconName = state === 'opened' ? 'eye-off-outline' : 'eye-outline';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.placeholder,
          active ? styles.placeholderActive : styles.placeholderMuted,
          isSender ? styles.senderContainer : styles.receiverContainer,
          style,
        ]}
        onPress={handlePress}
        disabled={!canOpen}
        activeOpacity={canOpen ? 0.7 : 1}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={active ? '#FF325E' : '#6C757D'}
        />
        <View style={styles.labelWrap}>
          <Text style={[styles.label, active ? styles.labelActive : styles.labelMuted]}>
            {label}
          </Text>
          <Text style={styles.subLabel}>Photo</Text>
        </View>
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
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 240,
    minWidth: 150,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    margin: 2,
    borderWidth: 1,
  },
  placeholderActive: {
    backgroundColor: '#FFE9EE',
    borderColor: '#FF325E',
  },
  placeholderMuted: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  senderContainer: {
    alignSelf: 'flex-end',
    marginLeft: 50,
  },
  receiverContainer: {
    alignSelf: 'flex-start',
    marginRight: 50,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: 'InterBold',
  },
  labelActive: {
    color: '#FF325E',
  },
  labelMuted: {
    color: '#6C757D',
  },
  subLabel: {
    fontSize: 11,
    fontFamily: 'InterRegular',
    color: '#9A9A9A',
    marginTop: 1,
  },
});

export default ImageMessage;

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Image } from 'expo-image'; // Import expo-image
import { FeedItem } from '@/types';

const { width, height } = Dimensions.get('window');

type ImageCarouselProps = {
  item: FeedItem;
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({ item }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);

  const handlePageChange = (position: number) => {
    setCurrentPage(position);
  };

  // Add blurhash placeholder or a loading indicator
  const placeholder = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
      >
        {item.images?.map((imageUrl: string, index: number) => (
          <View key={`${imageUrl}-${index}`} style={styles.page}>
            <Image
              source={imageUrl}
              style={styles.image}
              contentFit="cover"
              transition={200}
              placeholder={placeholder}
              cachePolicy="memory-disk"
              // Add priority loading for first image
              priority={index === 0 ? 'high' : 'normal'}
            />
          </View>
        ))}
      </PagerView>

      {item.images && item.images.length > 1 && (
        <View style={styles.pagination}>
          {item.images.map((_, index: number) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    height:
      Platform.OS === 'android'
        ? height + (StatusBar.currentHeight || 0)
        : height,
    width: width,
  },
  page: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: '35%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  paginationDotActive: {
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});

export default ImageCarousel;

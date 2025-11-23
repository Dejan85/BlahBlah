import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
} from "@shopify/react-native-skia";
import { CameraContext } from "@/context/CameraContext";
import { AntDesign } from "@expo/vector-icons";
import { FilterOption, filterOptions } from "@/types";

const { width: screenWidth } = Dimensions.get("window");
const ITEM_SIZE = screenWidth * 0.72;
const SPACING = 15;
const EMPTY_ITEM_SIZE = (screenWidth - ITEM_SIZE) / 2;

const FilterItem = React.memo(
  ({
    item,

    imageUri,
  }: {
    item: FilterOption | { key: string; empty: boolean };
    index: number;
    scrollX: Animated.Value;
    imageUri: string;
  }) => {
    if ((item as any).empty) {
      return <View style={{ width: EMPTY_ITEM_SIZE }} />;
    }

    const filter = item as FilterOption;
    const image = useImage(imageUri);

    if (!image) return null;

    return (
      <Animated.View style={[styles.itemContainer]}>
        <Text style={styles.filterName}>{filter.name}</Text>
        <Animated.View style={[styles.imageContainer]}>
          <Canvas style={styles.canvas}>
            <SkiaImage
              image={image}
              fit="cover"
              width={ITEM_SIZE - SPACING * 2}
              height={ITEM_SIZE - SPACING * 2}
            >
              <ColorMatrix matrix={filter.matrix} />
            </SkiaImage>
          </Canvas>
        </Animated.View>
      </Animated.View>
    );
  },
);

export const FilterCarousel: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onApply?: () => void;
}> = ({ isVisible, onClose, onApply }) => {
  const { capturedPhoto, selectedFilter, setSelectedFilter } =
    useContext(CameraContext);
  const [tempFilter, setTempFilter] = useState(selectedFilter);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTempFilter(selectedFilter);
  }, [selectedFilter]);

  if (!isVisible || !capturedPhoto?.uri) return null;

  const data = [
    { key: "empty-left", empty: true },
    ...filterOptions,
    { key: "empty-right", empty: true },
  ];

  const handleSnapToItem = (scrollOffset: number) => {
    // Calculate the real index from scroll position
    const index = Math.floor((scrollOffset + ITEM_SIZE / 2) / ITEM_SIZE);
    const filterIndex = index; // Adjust for empty left item

    if (filterIndex >= 0 && filterIndex < filterOptions.length) {
      const newFilter = filterOptions[filterIndex].name;
      setTempFilter(newFilter);
      setSelectedFilter(newFilter);
    }
  };

  const handleApply = () => {
    // Filter is already applied in handleSnapToItem
    if (onApply) {
      onApply();
    }
    onClose();
  };

  const handleClose = () => {
    setTempFilter(selectedFilter);
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <AntDesign name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerButton, styles.applyButton]}
          onPress={handleApply}
        >
          <AntDesign name="check" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={data}
        horizontal
        bounces={false}
        renderItem={({ item, index }) => (
          <FilterItem
            item={item}
            index={index}
            scrollX={scrollX}
            imageUri={capturedPhoto.uri}
          />
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        snapToInterval={ITEM_SIZE}
        decelerationRate={0}
        snapToAlignment="start"
        contentContainerStyle={styles.flatListContent}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(ev) => {
          handleSnapToItem(ev.nativeEvent.contentOffset.x);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    paddingTop: 40,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  applyButton: {
    backgroundColor: "#FF325E",
  },
  flatListContent: {
    alignItems: "center",
    paddingVertical: 10,
  },
  itemContainer: {
    width: ITEM_SIZE,
    alignItems: "center",
    padding: SPACING,
  },
  imageContainer: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: "#fff",
  },
  canvas: {
    width: ITEM_SIZE - SPACING * 2,
    height: ITEM_SIZE - SPACING * 2,
    borderRadius: 20,
  },
  filterName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "InterBold",
    marginVertical: 10,
    textAlign: "center",
  },
});

export default FilterCarousel;

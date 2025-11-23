import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetFlashList } from "@gorhom/bottom-sheet";
import { ListRenderItem } from "@shopify/flash-list";

interface UserListBottomSheetProps<T> {
  visible?: boolean;
  onClose?: () => void;
  data: T[];
  renderItem: ListRenderItem<T>; // Use ListRenderItem type
  keyExtractor: (item: T) => string;
  snapPoints?: (string | number)[];
  estimatedItemSize?: number;
}

export interface UserListBottomSheetRef {
  snapToIndex: (index: number) => void;
}

const UserListBottomSheet = forwardRef<
  UserListBottomSheetRef,
  UserListBottomSheetProps<any>
>(
  (
    {
      visible,
      onClose,
      data,
      renderItem,
      keyExtractor,
      snapPoints = ["25%", "50%"],
      estimatedItemSize = 43.3,
    },
    ref,
  ) => {
    // hooks
    const sheetRef = useRef<BottomSheet>(null);

    // Expose the `snapToIndex` method to the parent component via ref
    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => {
        sheetRef.current?.snapToIndex(index);
      },
    }));

    return (
      <GestureHandlerRootView style={styles.container}>
        <BottomSheet
          ref={sheetRef}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          onClose={onClose}
          index={-1}
        >
          <BottomSheetFlashList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            estimatedItemSize={estimatedItemSize}
            style={styles.item}
          />
        </BottomSheet>
      </GestureHandlerRootView>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
  },
  item: {},
  itemContainer: {
    padding: 6,
    margin: 6,
    backgroundColor: "#eee",
  },
});

export default UserListBottomSheet;

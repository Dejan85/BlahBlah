import React from "react";
import { View, StyleSheet } from "react-native";
import CustomTextInput from "./CustomTextInput";

interface SearchComponentProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <View style={styles.searchContainer}>
      <CustomTextInput
        style={styles.searchInput}
        placeholder="SearchComponent..."
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholderTextColor="#B3B3B3"
        styleContainer={styles.searchContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",

    width: "75%",
    justifyContent: "center",
    alignContent: "center",
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: "white",
    borderRadius: 35,
    paddingHorizontal: 15,

    borderWidth: 2,
    borderColor: "#B3B3B3",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  cameraButton: {
    padding: 10,
  },
});

export default SearchComponent;

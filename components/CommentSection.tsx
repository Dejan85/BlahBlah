import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EditPencil } from "@/assets/images";

interface CommentSectionProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
}

export const CommentSection = ({
  value,
  onChange,
  onSubmit,
}: CommentSectionProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedText, setHighlightedText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const formatText = useCallback((text: string) => {
    const words = text.split(" ");
    return words.map((word, index) => {
      if (word.startsWith("@")) {
        return (
          <Text key={index} style={styles.mention}>
            {word}{" "}
          </Text>
        );
      } else if (word.startsWith("#")) {
        return (
          <Text key={index} style={styles.hashtag}>
            {word}{" "}
          </Text>
        );
      }
      return word + " ";
    });
  }, []);

  const handleTextChange = (text: string) => {
    const lastWord = text.split(" ").pop() || "";
    if (lastWord.startsWith("@") || lastWord.startsWith("#")) {
      setHighlightedText(lastWord);
    } else {
      setHighlightedText("");
    }
    onChange(text);
  };

  const characterCount = value.length;
  const maxCharacters = 2200;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          multiline
          placeholder="Write a caption..."
          placeholderTextColor="#666"
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxCharacters}
        />
        <EditPencil style={styles.editIcon} />
      </View>

      {/* Character counter */}
      <Text style={styles.characterCount}>
        {characterCount}/{maxCharacters}
      </Text>

      {/* Preview section */}
      {value.length > 0 && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Preview:</Text>
          <View style={styles.previewContent}>
            <Text
              style={styles.previewText}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {formatText(value)}
            </Text>
            {value.length > 100 && !isExpanded && (
              <TouchableOpacity
                onPress={() => setIsExpanded(true)}
                style={styles.seeMoreButton}
              >
                <Text style={styles.seeMoreText}>... see more</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Suggestions for mentions/hashtags */}
      {highlightedText && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>
            {highlightedText.startsWith("@")
              ? "Mention someone:"
              : "Trending hashtags:"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {highlightedText.startsWith("@") ? (
              <View style={styles.suggestionChips}>
                <TouchableOpacity style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>@user1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>@user2</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.suggestionChips}>
                <TouchableOpacity style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>#trending</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>#viral</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    padding: 12,
    minHeight: 100,
  },
  inputContainerFocused: {
    borderWidth: 1,
    borderColor: "#FF325E",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: "#000",
    paddingRight: 30,
    fontFamily: "InterRegular",
  },
  editIcon: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  characterCount: {
    textAlign: "right",
    color: "#666",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "InterRegular",
  },
  previewContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontFamily: "InterMedium",
  },
  previewContent: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#000",
    fontFamily: "InterRegular",
  },
  mention: {
    color: "#FF325E",
    fontFamily: "InterSemiBold",
  },
  hashtag: {
    color: "#0095F6",
    fontFamily: "InterSemiBold",
  },
  seeMoreButton: {
    marginTop: 4,
  },
  seeMoreText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  suggestionsContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontFamily: "InterMedium",
  },
  suggestionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  suggestionChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  suggestionText: {
    color: "#000",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
});

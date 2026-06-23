import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ReportOption {
  title: string;
  message: string;
}

interface ReportMenuProps {
  onClose?: () => void;
  visible?: boolean;
}

const ReportMenu: React.FC<ReportMenuProps> = () => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const reportOptions: Record<string, ReportOption> = {
    spam: {
      title: 'Spam',
      message:
        "Thanks for letting us know! We'll review this content to stop any spam.",
    },
    harassment: {
      title: 'Harassment',
      message:
        'We take harassment seriously. Our team will investigate this report promptly.',
    },
    inappropriate: {
      title: 'Inappropriate Content',
      message:
        'This content will be reviewed for violations of our guidelines. Thank you for keeping our community safe!',
    },
    other: {
      title: 'Other Issues',
      message:
        'Your report has been submitted. Our team will review the issue and take necessary action.',
    },
  };

  const handleOptionPress = (key: string) => {
    setSelectedOption(selectedOption === key ? null : key);
  };

  return (
    <View style={styles.container}>
      {Object.entries(reportOptions).map(([key, option]) => (
        <View key={key} style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOptionPress(key)}
          >
            <Text style={styles.optionText}>{option.title}</Text>
            <Text style={styles.arrow}>
              {selectedOption === key ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {selectedOption === key && (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{option.message}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

export default ReportMenu;

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  optionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'InterMedium',
    color: '#000',
  },
  messageContainer: {
    backgroundColor: '#f8f8f8',
    overflow: 'hidden',
  },
  message: {
    padding: 15,
    fontSize: 14,
    fontFamily: 'InterRegular',
    color: '#666',
  },
  arrow: {
    fontSize: 16,
    color: '#666',
  },
});

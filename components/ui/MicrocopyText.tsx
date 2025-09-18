import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface MicrocopyTextProps {
  children: string;
  type?: 'help' | 'instruction' | 'warning' | 'success';
  size?: 'small' | 'medium';
}

export const MicrocopyText: React.FC<MicrocopyTextProps> = ({
  children,
  type = 'help',
  size = 'small',
}) => {
  const getTextStyle = () => {
    const baseStyle = [
      styles.text,
      size === 'medium' ? styles.textMedium : styles.textSmall,
    ];

    switch (type) {
      case 'instruction':
        return [...baseStyle, styles.instructionText];
      case 'warning':
        return [...baseStyle, styles.warningText];
      case 'success':
        return [...baseStyle, styles.successText];
      default:
        return [...baseStyle, styles.helpText];
    }
  };

  return <Text style={getTextStyle()}>{children}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontStyle: 'italic',
    lineHeight: 16,
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 13,
  },
  helpText: {
    color: '#6b7280',
  },
  instructionText: {
    color: '#3730a3',
  },
  warningText: {
    color: '#92400e',
  },
  successText: {
    color: '#166534',
  },
});
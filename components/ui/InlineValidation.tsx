import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X } from 'lucide-react-native';

interface InlineValidationProps {
  isValid: boolean;
  message?: string;
  type?: 'error' | 'warning' | 'success';
  showIcon?: boolean;
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
  isValid,
  message,
  type = 'error',
  showIcon = true,
}) => {
  if (isValid && !message) return null;

  const getIcon = () => {
    if (!showIcon) return null;
    
    if (isValid) {
      return <CheckCircle size={16} color="#10b981" />;
    } else {
      switch (type) {
        case 'warning':
          return <AlertTriangle size={16} color="#f59e0b" />;
        case 'success':
          return <CheckCircle size={16} color="#10b981" />;
        default:
          return <X size={16} color="#ef4444" />;
      }
    }
  };

  const getContainerStyle = () => {
    if (isValid) {
      return [styles.container, styles.successContainer];
    } else {
      switch (type) {
        case 'warning':
          return [styles.container, styles.warningContainer];
        case 'success':
          return [styles.container, styles.successContainer];
        default:
          return [styles.container, styles.errorContainer];
      }
    }
  };

  const getTextStyle = () => {
    if (isValid) {
      return [styles.text, styles.successText];
    } else {
      switch (type) {
        case 'warning':
          return [styles.text, styles.warningText];
        case 'success':
          return [styles.text, styles.successText];
        default:
          return [styles.text, styles.errorText];
      }
    }
  };

  return (
    <View style={getContainerStyle()}>
      {getIcon()}
      <Text style={getTextStyle()}>
        {message || (isValid ? 'Campo válido' : 'Campo inválido')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    gap: 6,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
  },
  warningContainer: {
    backgroundColor: '#fffbeb',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    color: '#dc2626',
  },
  warningText: {
    color: '#92400e',
  },
  successText: {
    color: '#166534',
  },
});
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Camera, Video } from 'lucide-react-native';

interface CameraButtonProps {
  onPress: () => void;
  mode?: 'photo' | 'video' | 'both';
  disabled?: boolean;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const CameraButton: React.FC<CameraButtonProps> = ({
  onPress,
  mode = 'photo',
  disabled = false,
  style,
  size = 'medium',
  variant = 'primary',
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size], styles[variant]];
    if (disabled) baseStyle.push(styles.disabled);
    if (style) baseStyle.push(style);
    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getIcon = () => {
    const iconSize = getIconSize();
    const iconColor = variant === 'outline' ? '#2563eb' : '#ffffff';
    
    if (mode === 'video') {
      return <Video size={iconSize} color={iconColor} />;
    } else if (mode === 'both') {
      return (
        <View style={styles.iconContainer}>
          <Camera size={iconSize - 2} color={iconColor} />
          <Video size={iconSize - 2} color={iconColor} />
        </View>
      );
    } else {
      return <Camera size={iconSize} color={iconColor} />;
    }
  };

  const getText = () => {
    switch (mode) {
      case 'video': return 'Gravar Vídeo';
      case 'both': return 'Câmera';
      default: return 'Tirar Foto';
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {getIcon()}
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
        {getText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  
  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  
  // Variants
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#6b7280',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: '500',
  },
  text_primary: {
    color: '#ffffff',
  },
  text_secondary: {
    color: '#ffffff',
  },
  text_outline: {
    color: '#2563eb',
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
  
  iconContainer: {
    flexDirection: 'row',
    gap: 2,
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  color = '#2563eb',
  size = 'medium',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const getContainerStyle = () => {
    switch (size) {
      case 'small':
        return [styles.container, styles.containerSmall];
      case 'large':
        return [styles.container, styles.containerLarge];
      default:
        return styles.container;
    }
  };

  const getBarHeight = () => {
    switch (size) {
      case 'small': return 3;
      case 'large': return 8;
      default: return 4;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 16;
      default: return 14;
    }
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.header}>
        {label && (
          <Text style={[styles.label, { fontSize: getTextSize() }]}>
            {label}
          </Text>
        )}
        <View style={styles.stats}>
          {showPercentage && (
            <Text style={[styles.percentage, { fontSize: getTextSize(), color }]}>
              {percentage}%
            </Text>
          )}
          <Text style={[styles.fraction, { fontSize: getTextSize() - 2 }]}>
            {current}/{total}
          </Text>
        </View>
      </View>
      
      <View style={[styles.progressBar, { height: getBarHeight() }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${percentage}%`,
              backgroundColor: color,
              height: getBarHeight(),
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  containerSmall: {
    paddingVertical: 8,
  },
  containerLarge: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentage: {
    fontWeight: '600',
  },
  fraction: {
    color: '#6b7280',
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 2,
  },
});
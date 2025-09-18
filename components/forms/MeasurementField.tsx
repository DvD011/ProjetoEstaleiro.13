import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { MeasurementConfig } from '@/types/inspection';

interface MeasurementFieldProps {
  measurement: MeasurementConfig;
  value: string;
  onValueChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  errorMessage?: string;
}

export const MeasurementField: React.FC<MeasurementFieldProps> = ({
  measurement,
  value,
  onValueChange,
  hasError = false,
  disabled = false,
  errorMessage,
}) => {
  const handleValueChange = (newValue: string) => {
    console.log(`Medição ${measurement.name} alterada:`, newValue);
    onValueChange(newValue);
  };
  
  const validateValue = (inputValue: string) => {
    if (!measurement.range) return true;
    
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return true; // Permitir valores vazios
    
    return numValue >= measurement.range.min && numValue <= measurement.range.max;
  };

  const isValid = validateValue(value) || value.trim() === '';
  const hasValidationError = !isValid && value.trim() !== '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {measurement.label}
        <Text style={styles.unit}> ({measurement.unit})</Text>
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            (hasValidationError || hasError) && styles.inputError,
            disabled && styles.inputDisabled
          ]}
          value={value}
          onChangeText={handleValueChange}
          placeholder="0"
          keyboardType="numeric"
          editable={!disabled}
        />
        
        {measurement.range && (
          <Text style={styles.rangeText}>
            {measurement.range.min} - {measurement.range.max}
          </Text>
        )}
      </View>

      {(hasValidationError || hasError) && measurement.range && (
        <Text style={styles.errorText}>
          {errorMessage || `Valor deve estar entre ${measurement.range.min} e ${measurement.range.max}`}
        </Text>
      )}

      {hasError && !hasValidationError && (
        <Text style={styles.errorText}>
          {errorMessage || 'Este campo é obrigatório'}
        </Text>
      )}

      {measurement.type === 'voltage' && (
        <Text style={styles.helpText}>
          💡 Medição de tensão elétrica
        </Text>
      )}
      
      {measurement.type === 'current' && (
        <Text style={styles.helpText}>
          ⚡ Medição de corrente elétrica
        </Text>
      )}
      
      {measurement.type === 'temperature' && (
        <Text style={styles.helpText}>
          🌡️ Medição de temperatura
        </Text>
      )}
      
      {measurement.type === 'resistance' && (
        <Text style={styles.helpText}>
          🔧 Medição de resistência/isolamento
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  unit: {
    color: '#6b7280',
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  rangeText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    minWidth: 80,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
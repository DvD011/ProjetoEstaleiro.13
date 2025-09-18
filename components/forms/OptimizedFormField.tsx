import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { InlineValidation } from '@/components/ui/InlineValidation';
import { MicrocopyText } from '@/components/ui/MicrocopyText';
import { ModuleFieldConfig } from '@/types/inspection';

interface OptimizedFormFieldProps {
  field: ModuleFieldConfig;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  showInlineValidation?: boolean;
}

export const OptimizedFormField: React.FC<OptimizedFormFieldProps> = ({
  field,
  value,
  onValueChange,
  onBlur,
  disabled = false,
  showInlineValidation = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });

  useEffect(() => {
    if (hasBeenTouched || value) {
      validateField();
    }
  }, [value, hasBeenTouched]);

  const validateField = () => {
    let isValid = true;
    let message = '';

    // Required field validation
    if (field.required && (!value || value.toString().trim() === '')) {
      isValid = false;
      message = `${field.label} é obrigatório`;
    }
    // Type-specific validations
    else if (value && value.toString().trim()) {
      switch (field.type) {
        case 'number':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            isValid = false;
            message = 'Deve ser um número válido';
          } else if (field.validation) {
            if (field.validation.min !== undefined && numValue < field.validation.min) {
              isValid = false;
              message = `Valor mínimo: ${field.validation.min}${field.unit ? ' ' + field.unit : ''}`;
            } else if (field.validation.max !== undefined && numValue > field.validation.max) {
              isValid = false;
              message = `Valor máximo: ${field.validation.max}${field.unit ? ' ' + field.unit : ''}`;
            }
          }
          break;

        case 'time':
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(value)) {
            isValid = false;
            message = 'Formato inválido (use HH:MM)';
          }
          break;

        case 'text':
          if (field.validation?.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              isValid = false;
              message = 'Formato inválido';
            }
          }
          break;
      }
    }

    setValidationState({ isValid, message });
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    validateField();
    onBlur?.();
  };

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
    
    // Real-time validation for certain field types
    if (field.type === 'time' || field.type === 'number') {
      setHasBeenTouched(true);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'select':
        return (
          <View style={styles.selectContainer}>
            {field.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.selectOption,
                  value === option && styles.selectOptionActive,
                  !validationState.isValid && hasBeenTouched && styles.selectOptionError,
                  disabled && styles.selectOptionDisabled,
                ]}
                onPress={() => handleValueChange(option)}
                disabled={disabled}
              >
                <Text style={[
                  styles.selectOptionText,
                  value === option && styles.selectOptionTextActive,
                  disabled && styles.selectOptionTextDisabled,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'textarea':
        return (
          <TextInput
            style={[
              styles.textArea,
              isFocused && styles.inputFocused,
              !validationState.isValid && hasBeenTouched && styles.inputError,
              disabled && styles.inputDisabled,
            ]}
            value={value}
            onChangeText={handleValueChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!disabled}
          />
        );

      default:
        return (
          <TextInput
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              !validationState.isValid && hasBeenTouched && styles.inputError,
              disabled && styles.inputDisabled,
            ]}
            value={value}
            onChangeText={handleValueChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
            editable={!disabled}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[
        styles.label,
        !validationState.isValid && hasBeenTouched && styles.labelError
      ]}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
        {field.unit && <Text style={styles.unit}> ({field.unit})</Text>}
      </Text>
      
      {field.description && (
        <MicrocopyText type="instruction">
          {field.description}
        </MicrocopyText>
      )}
      
      {renderField()}
      
      {showInlineValidation && hasBeenTouched && (
        <InlineValidation
          isValid={validationState.isValid}
          message={validationState.message}
          type={validationState.isValid ? 'success' : 'error'}
        />
      )}
      
      {field.validation && field.type === 'number' && validationState.isValid && (
        <MicrocopyText type="help">
          Faixa válida: {field.validation.min} - {field.validation.max}{field.unit ? ' ' + field.unit : ''}
        </MicrocopyText>
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
  labelError: {
    color: '#ef4444',
  },
  required: {
    color: '#ef4444',
  },
  unit: {
    color: '#6b7280',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1f2937',
  },
  inputFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1f2937',
    minHeight: 100,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectOptionError: {
    borderColor: '#ef4444',
  },
  selectOptionDisabled: {
    opacity: 0.5,
  },
  selectOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#ffffff',
  },
  selectOptionTextDisabled: {
    color: '#9ca3af',
  },
});
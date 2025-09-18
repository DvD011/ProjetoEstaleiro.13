import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { ModuleFieldConfig } from '@/types/inspection';
import { DateTimePickerField } from './DateTimePicker';

interface FormFieldProps {
  field: ModuleFieldConfig;
  value: string;
  onValueChange: (value: string) => void;
  otherValue?: string;
  onOtherValueChange?: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  showValidationHint?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  onValueChange,
  otherValue = '',
  onOtherValueChange,
  hasError = false,
  disabled = false,
  showValidationHint = true,
}) => {
  const handleValueChange = (newValue: string) => {
    console.log(`Campo ${field.name} alterado:`, newValue);
    onValueChange(newValue);
  };

  const handleOtherValueChange = (newValue: string) => {
    console.log(`Campo ${field.name}_other alterado:`, newValue);
    onOtherValueChange?.(newValue);
  };
  
  const validateNumberField = (value: string): { isValid: boolean; message?: string } => {
    if (!value || field.type !== 'number') return { isValid: true };
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { isValid: false, message: 'Deve ser um número válido' };
    }
    
    if (field.validation) {
      if (field.validation.min !== undefined && numValue < field.validation.min) {
        return { isValid: false, message: `Valor mínimo: ${field.validation.min}${field.unit ? ' ' + field.unit : ''}` };
      }
      if (field.validation.max !== undefined && numValue > field.validation.max) {
        return { isValid: false, message: `Valor máximo: ${field.validation.max}${field.unit ? ' ' + field.unit : ''}` };
      }
    }
    
    return { isValid: true };
  };
  
  const validation = validateNumberField(value);
  const hasValidationError = !validation.isValid && value.trim() !== '';
  
  const getTextAreaLines = (fieldName: string): number => {
    switch (fieldName) {
      case 'conclusion': return 6; // Campo mais importante, mais espaço
      case 'critical_issues': return 5;
      case 'recommendations': return 5;
      case 'priority_actions': return 4;
      default: return 4;
    }
  };

  const getTextAreaMaxLength = (fieldName: string): number => {
    switch (fieldName) {
      case 'conclusion': return 2000; // Conclusão pode ser mais extensa
      case 'critical_issues': return 1500;
      case 'recommendations': return 1500;
      case 'priority_actions': return 1000;
      default: return 500;
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'date':
        return (
          <View>
            <DateTimePickerField
              label={field.label}
              value={value}
              onValueChange={onValueChange}
              mode="date"
              required={field.required}
              hasError={hasError}
              disabled={disabled}
              placeholder={field.placeholder}
            />
            {hasError && (
              <Text style={styles.fieldError}>Este campo é obrigatório</Text>
            )}
          </View>
        );

      case 'time':
        return (
          <View>
            <DateTimePickerField
              label={field.label}
              value={value}
              onValueChange={onValueChange}
              mode="time"
              required={field.required}
              hasError={hasError}
              disabled={disabled}
              placeholder={field.placeholder}
            />
            {hasError && (
              <Text style={styles.fieldError}>Este campo é obrigatório</Text>
            )}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <View style={styles.booleanHeader}>
              <Text style={[styles.label, hasError && styles.labelError]}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>
              <Switch
                value={value === 'true'}
                onValueChange={(val) => handleValueChange(val.toString())}
                trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                thumbColor={value === 'true' ? '#2563eb' : '#9ca3af'}
                disabled={disabled}
              />
            </View>
            <Text style={styles.booleanHint}>
              {field.name === 'authorization' 
                ? 'Marque se a autorização foi obtida dos responsáveis'
                : field.name === 'oil_leakage'
                ? 'Marque apenas se houver vazamento de óleo visível'
                : 'Marque apenas se presente ou executado'
              }
            </Text>
            {value === 'true' && (
              <View style={styles.booleanConfirmation}>
                <Text style={styles.confirmationText}>
                  ✓ {field.name === 'authorization' ? 'Autorização confirmada' : 
                      field.name === 'oil_leakage' ? 'Vazamento detectado' : 'Confirmado'}
                </Text>
              </View>
            )}
          </View>
        );

      case 'select':
        return (
          <View>
            <Text style={[styles.label, hasError && styles.labelError]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    value === option && styles.selectOptionActive,
                    hasError && styles.selectOptionError,
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
            
            {/* Campo dinâmico para "Outro" */}
            {value === 'Outro' && onOtherValueChange && (
              <View style={styles.otherFieldContainer}>
                <Text style={styles.otherFieldLabel}>
                  Especifique {field.label.toLowerCase()}:
                </Text>
                <TextInput
                  style={[styles.otherFieldInput, hasError && styles.inputError]}
                  value={otherValue}
                  onChangeText={handleOtherValueChange}
                  placeholder={`Digite o ${field.label.toLowerCase()} específico`}
                  editable={!disabled}
                  autoFocus={true}
                />
              </View>
            )}
          </View>
        );

      case 'textarea':
        return (
          <View>
            <Text style={[styles.label, hasError && styles.labelError]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.textArea, hasError && styles.inputError]}
              value={value}
              onChangeText={handleValueChange}
              placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
              multiline
              numberOfLines={getTextAreaLines(field.name)}
              textAlignVertical="top"
              editable={!disabled}
              scrollEnabled={true}
              maxLength={getTextAreaMaxLength(field.name)}
            />
            {field.name === 'conclusion' && (
              <Text style={styles.textAreaHint}>
                💡 Descreva a avaliação final da instalação, incluindo conformidade com normas técnicas
              </Text>
            )}
            {field.name === 'critical_issues' && (
              <Text style={styles.textAreaHint}>
                ⚠️ Liste problemas que requerem atenção imediata ou representam riscos de segurança
              </Text>
            )}
            {field.name === 'recommendations' && (
              <Text style={styles.textAreaHint}>
                📋 Forneça recomendações técnicas para melhorias e manutenções
              </Text>
            )}
            {field.name === 'priority_actions' && (
              <Text style={styles.textAreaHint}>
                🚨 Defina ações que devem ser executadas prioritariamente
              </Text>
            )}
            <Text style={styles.characterCount}>
              {value.length}/{getTextAreaMaxLength(field.name)} caracteres
            </Text>
          </View>
        );

      default:
        return (
          <View>
            <Text style={[styles.label, hasError && styles.labelError]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
              {field.unit && <Text style={styles.unit}> ({field.unit})</Text>}
            </Text>
            <TextInput
              style={[
                styles.input, 
                (hasError || hasValidationError) && styles.inputError
              ]}
              value={value}
              onChangeText={handleValueChange}
              placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              editable={!disabled}
            />
            {field.validation && field.type === 'number' && !hasValidationError && (
              <Text style={styles.rangeHint}>
                Faixa válida: {field.validation.min} - {field.validation.max}{field.unit ? ' ' + field.unit : ''}
              </Text>
            )}
            {(hasError || hasValidationError) && (
              <Text style={styles.fieldError}>
                {hasValidationError ? validation.message : 'Este campo é obrigatório'}
              </Text>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderField()}
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
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
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
    minHeight: 120,
    maxHeight: 200,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  booleanContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  booleanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  booleanHint: {
    color: '#6b7280',
    fontWeight: '400',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  booleanConfirmation: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  confirmationText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
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
  otherFieldContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  otherFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e40af',
    marginBottom: 8,
  },
  otherFieldInput: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    color: '#1f2937',
  },
  validationError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  rangeHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  textAreaHint: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    lineHeight: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  fieldError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  characterCount: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
});
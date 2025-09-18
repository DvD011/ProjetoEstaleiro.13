import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ModuleFieldConfig } from '@/types/inspection';
import { CircleCheck as CheckCircle, Circle } from 'lucide-react-native';

interface BooleanFieldGroupProps {
  fields: ModuleFieldConfig[];
  values: Record<string, string>;
  onValueChange: (fieldName: string, value: string) => void;
  title: string;
  description?: string;
  disabled?: boolean;
  hasError?: boolean;
  errorFields?: string[];
}

export const BooleanFieldGroup: React.FC<BooleanFieldGroupProps> = ({
  fields,
  values,
  onValueChange,
  title,
  description,
  disabled = false,
  hasError = false,
  errorFields = [],
}) => {
  const booleanFields = fields.filter(f => f.type === 'boolean');

  const handleToggle = (fieldName: string) => {
    const currentValue = values[fieldName] === 'true';
    onValueChange(fieldName, (!currentValue).toString());
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      
      {!title && (
        <Text style={styles.instruction}>
          Marque apenas os itens que estão presentes na instalação. 
          Itens não marcados serão registrados como "ausentes na instalação".
        </Text>
      )}

      <View style={styles.fieldsContainer}>
        {booleanFields.map((field) => {
          const isSelected = values[field.name] === 'true';
          const fieldHasError = errorFields.includes(field.name);
          
          return (
            <TouchableOpacity
              key={field.name}
              style={[
                styles.fieldItem,
                isSelected && styles.fieldItemSelected,
                fieldHasError && styles.fieldItemError,
                disabled && styles.fieldItemDisabled,
              ]}
              onPress={() => handleToggle(field.name)}
              disabled={disabled}
            >
              <View style={styles.fieldContent}>
                <View style={styles.checkboxContainer}>
                  {isSelected ? (
                    <CheckCircle size={20} color="#2563eb" />
                  ) : (
                    <Circle size={20} color="#9ca3af" />
                  )}
                </View>
                
                <Text style={[
                  styles.fieldLabel,
                  isSelected && styles.fieldLabelSelected,
                  fieldHasError && styles.fieldLabelError,
                  disabled && styles.fieldLabelDisabled,
                ]}>
                  {field.label}
                </Text>
              </View>
              
              {isSelected && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Presente</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {booleanFields.filter(f => values[f.name] === 'true').length} de {booleanFields.length} itens marcados como presentes
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  instruction: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  fieldsContainer: {
    gap: 8,
  },
  fieldItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  fieldItemDisabled: {
    opacity: 0.6,
  },
  fieldItemError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  fieldLabelSelected: {
    color: '#1e40af',
  },
  fieldLabelDisabled: {
    color: '#9ca3af',
  },
  fieldLabelError: {
    color: '#ef4444',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
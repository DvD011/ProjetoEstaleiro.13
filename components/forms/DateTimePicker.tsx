import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';

interface DateTimePickerFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  mode: 'date' | 'time';
  required?: boolean;
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({
  label,
  value,
  onValueChange,
  mode,
  required = false,
  hasError = false,
  disabled = false,
  placeholder,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const parseValue = (value: string): Date => {
    if (!value) return new Date();
    
    if (mode === 'date') {
      // Formato esperado: DD/MM/YYYY ou YYYY-MM-DD
      if (value.includes('/')) {
        const [day, month, year] = value.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (value.includes('-')) {
        return new Date(value);
      }
    } else if (mode === 'time') {
      // Formato esperado: HH:MM
      const [hours, minutes] = value.split(':');
      const date = new Date();
      date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      return date;
    }
    
    return new Date();
  };

  const formatValue = (date: Date): string => {
    if (mode === 'date') {
      return date.toLocaleDateString('pt-BR');
    } else {
      // Formato 24 horas mais consistente
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      if (Platform.OS === 'ios') {
        setTempDate(selectedDate);
      } else {
        const formattedValue = formatValue(selectedDate);
        console.log(`${mode} picker - valor selecionado:`, formattedValue);
        onValueChange(formattedValue);
      }
    }
  };

  const handleIOSConfirm = () => {
    if (tempDate) {
      const formattedValue = formatValue(tempDate);
      console.log(`${mode} picker - valor confirmado:`, formattedValue);
      onValueChange(formattedValue);
    }
    setShowPicker(false);
    setTempDate(null);
  };

  const handleIOSCancel = () => {
    setShowPicker(false);
    setTempDate(null);
  };

  const openPicker = () => {
    if (!disabled) {
      console.log(`Abrindo ${mode} picker com valor atual:`, value);
      setTempDate(parseValue(value));
      setShowPicker(true);
    }
  };

  const displayValue = value || (mode === 'date' ? 'DD/MM/AAAA' : 'HH:MM');
  const Icon = mode === 'date' ? Calendar : Clock;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, hasError && styles.labelError]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
        {mode === 'time' && (
          <Text style={styles.timeHint}> (formato 24h)</Text>
        )}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.inputContainer,
          hasError && styles.inputError,
          disabled && styles.inputDisabled
        ]}
        onPress={openPicker}
        disabled={disabled}
      >
        <Icon size={20} color="#6b7280" />
        <Text style={[
          styles.inputText,
          !value && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {displayValue}
        </Text>
        {mode === 'time' && (
          <Text style={styles.formatIndicator}>24h</Text>
        )}
      </TouchableOpacity>

      {mode === 'time' && value && (
        <Text style={styles.timeConfirmation}>
          ⏰ Horário selecionado: {value}
        </Text>
      )}

      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showPicker}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleIOSCancel}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    {mode === 'date' ? 'Selecionar Data' : 'Selecionar Hora'}
                  </Text>
                  <TouchableOpacity onPress={handleIOSConfirm}>
                    <Text style={styles.modalConfirmText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate || parseValue(value)}
                  mode={mode}
                  display="spinner"
                  onChange={handleDateChange}
                  locale="pt-BR"
                  is24Hour={true}
                  minuteInterval={1}
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseValue(value)}
            mode={mode}
            display="default"
            onChange={handleDateChange}
            locale="pt-BR"
            is24Hour={true}
            minuteInterval={1}
          />
        )
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  disabledText: {
    color: '#9ca3af',
  },
  timeHint: {
    color: '#6b7280',
    fontWeight: '400',
    fontSize: 12,
  },
  formatIndicator: {
    fontSize: 10,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeConfirmation: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  iosPicker: {
    backgroundColor: '#ffffff',
  },
});
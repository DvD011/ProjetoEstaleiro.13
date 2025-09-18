import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { TriangleAlert as AlertTriangle, X, CircleCheck as CheckCircle, FileText, Shield } from 'lucide-react-native';

interface ValidationError {
  field: string;
  message: string;
  section?: string;
  isCritical?: boolean;
}

interface ValidationSummaryProps {
  errors: ValidationError[];
  onDismiss?: () => void;
  onFieldFocus?: (fieldName: string) => void;
  onGenerateReport?: () => void;
  style?: any;
  showSuccessMessage?: boolean;
  showReportButton?: boolean;
  reportButtonText?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  onDismiss,
  onFieldFocus,
  onGenerateReport,
  style,
  showSuccessMessage = true,
  showReportButton = false,
  reportButtonText = 'Gerar Relatório PDF',
}) => {
  const criticalErrors = errors.filter(e => e.isCritical);
  const regularErrors = errors.filter(e => !e.isCritical);

  const handleGenerateReport = () => {
    if (errors.length > 0) {
      const criticalCount = criticalErrors.length;
      const totalCount = errors.length;
      
      Alert.alert(
        'Validação Pendente',
        `${criticalCount > 0 ? `${criticalCount} erro(s) crítico(s) e ` : ''}${totalCount} campo(s) obrigatório(s) ainda precisam ser preenchidos.\n\nDeseja continuar mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar', 
            style: 'destructive',
            onPress: onGenerateReport 
          },
        ]
      );
    } else {
      onGenerateReport?.();
    }
  };

  if (errors.length === 0 && showSuccessMessage) {
    return (
      <View style={[styles.container, styles.successContainer, style]}>
        <View style={styles.successContent}>
          <CheckCircle size={20} color="#10b981" />
          <Text style={styles.successText}>Todos os campos obrigatórios foram preenchidos</Text>
        </View>
        
        {showReportButton && onGenerateReport && (
          <TouchableOpacity style={styles.reportButton} onPress={onGenerateReport}>
            <FileText size={16} color="#ffffff" />
            <Text style={styles.reportButtonText}>{reportButtonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (errors.length === 0) {
    return null;
  }

  const groupedErrors = errors.reduce((acc, error) => {
    const section = error.section || 'Geral';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  return (
    <View style={[styles.container, styles.errorContainer, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {criticalErrors.length > 0 ? (
            <Shield size={20} color="#dc2626" />
          ) : (
            <AlertTriangle size={20} color="#ef4444" />
          )}
          <Text style={styles.title}>
            {criticalErrors.length > 0 && (
              <Text style={styles.criticalIndicator}>CRÍTICO: </Text>
            )}
            {errors.length} campo{errors.length > 1 ? 's' : ''} pendente{errors.length > 1 ? 's' : ''}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.errorsContainer} showsVerticalScrollIndicator={false}>
        {/* Critical Errors First */}
        {criticalErrors.length > 0 && (
          <View style={styles.criticalSection}>
            <Text style={styles.criticalSectionTitle}>Erros Críticos (Impedem Geração do Relatório)</Text>
            {criticalErrors.map((error, index) => (
              <TouchableOpacity
                key={`critical-${index}`}
                style={styles.criticalErrorItem}
                onPress={() => onFieldFocus?.(error.field)}
                activeOpacity={0.7}
              >
                <Shield size={16} color="#dc2626" />
                <Text style={styles.criticalErrorText}>{error.message}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Regular Errors */}
        {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
          <View key={section} style={styles.errorSection}>
            {Object.keys(groupedErrors).length > 1 && (
              <Text style={styles.sectionTitle}>{section}</Text>
            )}
            
            {sectionErrors.filter(e => !e.isCritical).map((error, index) => (
              <TouchableOpacity
                key={`${section}-${index}`}
                style={styles.errorItem}
                onPress={() => onFieldFocus?.(error.field)}
                activeOpacity={0.7}
              >
                <View style={styles.errorDot} />
                <Text style={styles.errorText}>{error.message}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      {showReportButton && onGenerateReport && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.reportButton,
              criticalErrors.length > 0 && styles.reportButtonDisabled
            ]} 
            onPress={handleGenerateReport}
            disabled={criticalErrors.length > 0}
          >
            <FileText size={16} color="#ffffff" />
            <Text style={styles.reportButtonText}>
              {criticalErrors.length > 0 ? 'Corrija Erros Críticos' : reportButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
    padding: 16,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fef2f2',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
  },
  criticalIndicator: {
    color: '#dc2626',
    fontWeight: '700',
  },
  dismissButton: {
    padding: 4,
  },
  errorsContainer: {
    maxHeight: 200,
    padding: 16,
    paddingTop: 0,
  },
  criticalSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  criticalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 12,
  },
  criticalErrorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 8,
  },
  criticalErrorText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  errorSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c2d12',
    marginBottom: 8,
    paddingLeft: 4,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 8,
  },
  errorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ef4444',
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
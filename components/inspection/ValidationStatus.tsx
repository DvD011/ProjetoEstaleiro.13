import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useReportGeneration, ValidationResult } from '@/hooks/useReportGeneration';
import { ValidationSummary } from '@/components/forms/ValidationSummary';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Shield, RefreshCw, FileText } from 'lucide-react-native';

interface ValidationStatusProps {
  inspectionId: string;
  onGenerateReport?: () => void;
  showReportButton?: boolean;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  inspectionId,
  onGenerateReport,
  showReportButton = true,
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { validateFinalReport } = useReportGeneration();

  useEffect(() => {
    if (inspectionId) {
      performValidation();
    }
  }, [inspectionId]);

  const performValidation = async () => {
    setLoading(true);
    try {
      const result = await validateFinalReport(inspectionId);
      setValidationResult(result);
    } catch (error) {
      console.error('Erro na validação:', error);
      setValidationResult({
        isValid: false,
        missingFields: ['Erro na validação'],
        errorsSample: ['Não foi possível validar os dados'],
        criticalErrors: ['Falha no sistema de validação'],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await performValidation();
    setRefreshing(false);
  };

  const getValidationIcon = () => {
    if (!validationResult) return <RefreshCw size={24} color="#6b7280" />;
    
    if (validationResult.criticalErrors.length > 0) {
      return <Shield size={24} color="#dc2626" />;
    } else if (!validationResult.isValid) {
      return <AlertTriangle size={24} color="#f59e0b" />;
    } else {
      return <CheckCircle size={24} color="#10b981" />;
    }
  };

  const getValidationStatus = () => {
    if (!validationResult) return 'Validando...';
    
    if (validationResult.criticalErrors.length > 0) {
      return `${validationResult.criticalErrors.length} erro(s) crítico(s)`;
    } else if (!validationResult.isValid) {
      return `${validationResult.missingFields.length} campo(s) pendente(s)`;
    } else {
      return 'Pronto para gerar relatório';
    }
  };

  const getValidationColor = () => {
    if (!validationResult) return '#6b7280';
    
    if (validationResult.criticalErrors.length > 0) {
      return '#dc2626';
    } else if (!validationResult.isValid) {
      return '#f59e0b';
    } else {
      return '#10b981';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            {getValidationIcon()}
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Status de Validação</Text>
              <Text style={[styles.statusText, { color: getValidationColor() }]}>
                {getValidationStatus()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={performValidation}
            disabled={loading}
          >
            <RefreshCw size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Validation Results */}
        {validationResult && (
          <ValidationSummary
            errors={[
              ...validationResult.criticalErrors.map(error => ({
                field: '',
                message: error,
                isCritical: true,
              })),
              ...validationResult.missingFields.map((field, index) => ({
                field: field,
                message: validationResult.errorsSample[index] || field,
                isCritical: false,
              })),
            ]}
            showSuccessMessage={true}
            showReportButton={showReportButton}
            reportButtonText="Gerar Relatório PDF"
            onGenerateReport={onGenerateReport}
          />
        )}

        {/* Validation Summary Stats */}
        {validationResult && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {validationResult.isValid ? '✓' : validationResult.missingFields.length}
              </Text>
              <Text style={styles.statLabel}>
                {validationResult.isValid ? 'Válido' : 'Pendentes'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#dc2626' }]}>
                {validationResult.criticalErrors.length}
              </Text>
              <Text style={styles.statLabel}>Críticos</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                {validationResult.missingFields.length - validationResult.criticalErrors.length}
              </Text>
              <Text style={styles.statLabel}>Regulares</Text>
            </View>
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Sobre a Validação</Text>
          <Text style={styles.helpText}>
            • <Text style={styles.helpBold}>Erros Críticos:</Text> Impedem a geração do relatório (autorização, conclusão)
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.helpBold}>Campos Pendentes:</Text> Recomendados mas não impedem a geração
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.helpBold}>Fotos Obrigatórias:</Text> 4 fotos mínimas são necessárias
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.helpBold}>Assinatura Digital:</Text> Autorização dos responsáveis é obrigatória
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  helpContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: '600',
    color: '#374151',
  },
});
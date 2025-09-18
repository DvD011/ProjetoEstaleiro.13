import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useReportGeneration, ValidationResult } from '@/hooks/useReportGeneration';
import { ExportHistory } from '@/components/inspection/ExportHistory';
import { ValidationSummary } from '@/components/forms/ValidationSummary';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, FileText, Mail, Download, History, Settings, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Send } from 'lucide-react-native';

export default function ReportGenerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reportMode, setReportMode] = useState<'compatibility' | 'enriched'>('compatibility');
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [emailValidationErrors, setEmailValidationErrors] = useState<string[]>([]);

  const { 
    validateFinalReport, 
    generateReportWithOptions, 
    loading: reportLoading 
  } = useReportGeneration();

  useEffect(() => {
    if (id) {
      performValidation();
    }
  }, [id]);

  useEffect(() => {
    validateEmails();
  }, [recipientEmails, sendEmail]);

  const performValidation = async () => {
    try {
      const validation = await validateFinalReport(id!);
      setValidationResult(validation);
    } catch (error) {
      console.error('Erro na validação:', error);
    }
  };

  const validateEmails = () => {
    if (!sendEmail || !recipientEmails.trim()) {
      setEmailValidationErrors([]);
      return;
    }

    const emails = recipientEmails.split(',').map(email => email.trim()).filter(email => email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setEmailValidationErrors([`E-mails inválidos: ${invalidEmails.join(', ')}`]);
    } else {
      setEmailValidationErrors([]);
    }
  };

  const handleGenerateReport = async () => {
    // Validate emails if sending
    if (sendEmail && emailValidationErrors.length > 0) {
      Alert.alert('Erro', 'Corrija os e-mails antes de continuar');
      return;
    }

    const emails = sendEmail && recipientEmails.trim() 
      ? recipientEmails.split(',').map(email => email.trim()).filter(email => email)
      : [];

    try {
      const result = await generateReportWithOptions(id!, {
        mode: reportMode,
        send_email: sendEmail,
        recipient_emails: emails,
        include_json: true,
      });
      
      if (result.success) {
        const modeText = reportMode === 'enriched' ? 'enriquecido' : 'padrão';
        const emailText = sendEmail ? ' e enviado por e-mail' : '';
        
        Alert.alert(
          'Relatório Gerado',
          `O relatório PDF ${modeText} foi gerado com sucesso${emailText}!\n\nVersão: v${result.version}`,
          [
            { text: 'Ver Histórico', onPress: () => setShowExportHistory(true) },
            { 
              text: 'Abrir PDF', 
              onPress: () => WebBrowser.openBrowserAsync(result.pdf_url!) 
            },
          ]
        );
      } else {
        if (result.validation_errors) {
          const criticalCount = result.critical_errors?.length || 0;
          const totalCount = result.validation_errors.length;
          
          Alert.alert(
            'Erro de Validação',
            `Não foi possível gerar o relatório. ${criticalCount > 0 ? `${criticalCount} erro(s) crítico(s) e ` : ''}${totalCount} campo(s) obrigatório(s) ausente(s):\n\n${result.error}`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Ver Detalhes', 
                onPress: () => showValidationDetails(result.validation_errors!, result.critical_errors)
              },
            ]
          );
        } else {
          Alert.alert('Erro', result.error || 'Não foi possível gerar o relatório PDF');
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o relatório PDF');
      console.error('Erro na geração do relatório:', error);
    }
  };

  const showValidationDetails = (validationErrors: string[], criticalErrors?: string[]) => {
    const criticalSection = criticalErrors && criticalErrors.length > 0 
      ? `ERROS CRÍTICOS:\n${criticalErrors.map(e => `• ${e}`).join('\n')}\n\n`
      : '';
    
    const allErrors = validationErrors.slice(0, 10);
    const moreErrors = validationErrors.length > 10 ? `\n... e mais ${validationErrors.length - 10} item(s)` : '';
    
    Alert.alert(
      'Detalhes da Validação',
      `${criticalSection}CAMPOS AUSENTES:\n${allErrors.map(e => `• ${e}`).join('\n')}${moreErrors}`,
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const canGenerateReport = validationResult?.isValid || (validationResult && validationResult.criticalErrors.length === 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Geração de Relatório</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowExportHistory(true)}
        >
          <History size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {validationResult?.isValid ? (
              <CheckCircle size={24} color="#10b981" />
            ) : validationResult?.criticalErrors.length ? (
              <AlertTriangle size={24} color="#dc2626" />
            ) : (
              <AlertTriangle size={24} color="#f59e0b" />
            )}
            <Text style={styles.statusTitle}>
              {validationResult?.isValid 
                ? 'Pronto para gerar relatório'
                : validationResult?.criticalErrors.length 
                ? `${validationResult.criticalErrors.length} erro(s) crítico(s)`
                : `${validationResult?.missingFields.length || 0} campo(s) pendente(s)`
              }
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {validationResult?.isValid 
              ? 'Todos os campos obrigatórios foram preenchidos e o relatório pode ser gerado.'
              : 'Alguns campos ainda precisam ser preenchidos antes da geração do relatório.'
            }
          </Text>
        </View>

        {/* Validation Summary */}
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
            showSuccessMessage={validationResult.isValid}
          />
        )}

        {/* Report Options */}
        <View style={styles.optionsCard}>
          <Text style={styles.optionsTitle}>Opções do Relatório</Text>
          
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Modo do Relatório</Text>
            <Text style={styles.optionMicrocopy}>
              Escolha o formato do relatório (Padrão para compatibilidade, Enriquecido para detalhes adicionais).
            </Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  reportMode === 'compatibility' && styles.modeOptionActive,
                ]}
                onPress={() => setReportMode('compatibility')}
              >
                <Text style={[
                  styles.modeOptionText,
                  reportMode === 'compatibility' && styles.modeOptionTextActive,
                ]}>
                  Padrão
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  reportMode === 'enriched' && styles.modeOptionActive,
                ]}
                onPress={() => setReportMode('enriched')}
              >
                <Text style={[
                  styles.modeOptionText,
                  reportMode === 'enriched' && styles.modeOptionTextActive,
                ]}>
                  Enriquecido
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.optionLabel}>Enviar por E-mail</Text>
                <Text style={styles.optionMicrocopy}>
                  Marque para enviar o relatório por e-mail após a geração.
                </Text>
              </View>
              <Switch
                value={sendEmail}
                onValueChange={setSendEmail}
                trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                thumbColor={sendEmail ? '#2563eb' : '#9ca3af'}
              />
            </View>
          </View>

          {sendEmail && (
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Destinatários do E-mail</Text>
              <Text style={styles.optionMicrocopy}>
                Endereços de e-mail para onde o relatório será enviado.
              </Text>
              <View style={[
                styles.inputContainer,
                emailValidationErrors.length > 0 && styles.inputError
              ]}>
                <Mail size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="emails@exemplo.com (separados por vírgula)"
                  value={recipientEmails}
                  onChangeText={setRecipientEmails}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  multiline
                />
              </View>
              {emailValidationErrors.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Report Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Prévia do Relatório</Text>
          <View style={styles.previewContent}>
            <FileText size={48} color="#2563eb" />
            <Text style={styles.previewText}>
              Relatório {reportMode === 'enriched' ? 'Enriquecido' : 'Padrão'}
            </Text>
            <Text style={styles.previewSubtext}>
              Formato PDF profissional com evidências fotográficas
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.validateButton}
            onPress={performValidation}
          >
            <Settings size={20} color="#2563eb" />
            <Text style={styles.validateButtonText}>Revalidar Dados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButtonLarge}
            onPress={() => setShowExportHistory(true)}
          >
            <History size={20} color="#8b5cf6" />
            <Text style={styles.historyButtonText}>Ver Histórico</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.generateButton,
            (!canGenerateReport || reportLoading || emailValidationErrors.length > 0) && styles.generateButtonDisabled
          ]}
          onPress={handleGenerateReport}
          disabled={!canGenerateReport || reportLoading || emailValidationErrors.length > 0}
        >
          {sendEmail ? <Send size={20} color="#ffffff" /> : <Download size={20} color="#ffffff" />}
          <Text style={styles.generateButtonText}>
            {reportLoading 
              ? 'Gerando...' 
              : sendEmail 
              ? 'Gerar e Enviar'
              : 'Gerar Relatório PDF'
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* Export History Modal */}
      {showExportHistory && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ExportHistory
              inspectionId={id!}
              visible={showExportHistory}
              onClose={() => setShowExportHistory(false)}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowExportHistory(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  optionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  optionGroup: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  optionMicrocopy: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  modeOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  modeOptionTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 12,
    color: '#1f2937',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 12,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
    marginBottom: 12,
  },
  validateButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    gap: 8,
  },
  historyButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  generateButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  closeModalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
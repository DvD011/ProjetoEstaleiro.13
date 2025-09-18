import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useModuleData } from '@/hooks/useModuleData';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { ValidationSummary } from '@/components/forms/ValidationSummary';
import { ArrowLeft, Save, FileText, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, PenTool, Clock, Shield } from 'lucide-react-native';

interface ValidationError {
  field: string;
  message: string;
}

export default function ReviewFinalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formData, setFormData] = useState({
    overall_condition: '',
    compliance_status: '',
    critical_issues: '',
    recommendations: '',
    priority_actions: '',
    conclusion: '',
    reconnection_authorized: false,
    final_tests: false,
    system_operational: false,
    reconnection_time: '',
    final_observations: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  const { 
    saveModuleData, 
    updateField,
    validateModule 
  } = useModuleData(id!, 'general_state');
  
  const { 
    validateFinalReport, 
    generateReportWithOptions,
    loading: reportLoading 
  } = useReportGeneration();

  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const errors: ValidationError[] = [];

    if (!formData.overall_condition) {
      errors.push({ field: 'overall_condition', message: 'Condição Geral é obrigatória.' });
    }

    if (!formData.compliance_status) {
      errors.push({ field: 'compliance_status', message: 'Status de Conformidade é obrigatório.' });
    }

    if (!formData.conclusion.trim()) {
      errors.push({ field: 'conclusion', message: 'Conclusão da Inspeção é obrigatória.' });
    }

    if (!formData.reconnection_authorized) {
      errors.push({ field: 'reconnection_authorized', message: 'Autorização de Religamento é obrigatória.' });
    }

    if (!formData.final_tests) {
      errors.push({ field: 'final_tests', message: 'Realização de Testes Finais é obrigatória.' });
    }

    if (!formData.system_operational) {
      errors.push({ field: 'system_operational', message: 'Confirmação de Sistema Operacional é obrigatória.' });
    }

    if (!signatureData) {
      errors.push({ field: 'signature', message: 'Assinatura é obrigatória para finalizar o relatório.' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return validationErrors.some(error => error.field === fieldName);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateField(field, value.toString());
  };

  const handleSaveReview = async () => {
    const isValid = validateForm();
    
    if (!isValid) {
      Alert.alert(
        'Campos Obrigatórios',
        `Por favor, preencha os seguintes campos:\n\n${validationErrors.map(e => `• ${e.message}`).join('\n')}`
      );
      return;
    }

    setSaving(true);
    try {
      await saveModuleData();
      
      // Perform final validation
      const finalValidation = await validateFinalReport(id!);
      
      if (finalValidation.isValid) {
        Alert.alert(
          'Revisão Concluída',
          'Todos os dados foram salvos e validados. A inspeção está pronta para gerar o relatório.',
          [
            { text: 'Ver Detalhes', onPress: () => router.back() },
            { text: 'Gerar Relatório', onPress: () => router.push(`/inspection/${id}/report-generation`) },
          ]
        );
      } else {
        Alert.alert(
          'Validação Pendente',
          `${finalValidation.criticalErrors.length > 0 ? 'Erros críticos encontrados. ' : ''}${finalValidation.missingFields.length} campo(s) ainda precisam ser preenchidos.`,
          [
            { text: 'Ver Detalhes', onPress: () => router.back() },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a revisão');
    } finally {
      setSaving(false);
    }
  };

  const handleSignature = () => {
    setShowSignaturePad(true);
  };

  const renderProgressIndicator = () => {
    const totalFields = 7; // Campos obrigatórios
    const completedFields = [
      formData.overall_condition,
      formData.compliance_status,
      formData.conclusion,
      formData.reconnection_authorized,
      formData.final_tests,
      formData.system_operational,
      signatureData,
    ].filter(Boolean).length;
    
    const progress = Math.round((completedFields / totalFields) * 100);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Revisão Final: {progress}%</Text>
          <Text style={styles.progressFields}>{completedFields}/{totalFields} itens</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Revisão Final e Assinatura</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveReview}
          disabled={saving}
        >
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      {renderProgressIndicator()}

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Finalize a inspeção</Text>
          <Text style={styles.instructionsText}>
            Confirme todos os dados coletados, adicione a conclusão final da inspeção e assine para finalizar o relatório.
          </Text>
        </View>

        {/* Validation Summary */}
        <ValidationSummary
          errors={validationErrors.map(error => ({ field: error.field, message: error.message }))}
          showSuccessMessage={validationErrors.length === 0}
        />

        {/* Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliação Geral</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('overall_condition') && styles.labelError]}>
              Condição Geral da Instalação <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Avaliação geral do estado da instalação.</Text>
            <View style={styles.selectContainer}>
              {['Excelente', 'Boa', 'Regular', 'Ruim', 'Crítica'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.overall_condition === option && styles.selectOptionActive,
                    hasFieldError('overall_condition') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('overall_condition', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.overall_condition === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('overall_condition') && (
              <Text style={styles.errorText}>{getFieldError('overall_condition')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('compliance_status') && styles.labelError]}>
              Status de Conformidade <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Indica se a instalação está em conformidade com as normas.</Text>
            <View style={styles.selectContainer}>
              {['Conforme', 'Não Conforme', 'Conforme com Restrições'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.compliance_status === option && styles.selectOptionActive,
                    hasFieldError('compliance_status') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('compliance_status', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.compliance_status === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('compliance_status') && (
              <Text style={styles.errorText}>{getFieldError('compliance_status')}</Text>
            )}
          </View>
        </View>

        {/* Detailed Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliação Detalhada</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Problemas Críticos Identificados</Text>
            <Text style={styles.microcopy}>Liste quaisquer problemas de alta prioridade.</Text>
            <TextInput
              style={styles.textArea}
              value={formData.critical_issues}
              onChangeText={(value) => updateFormData('critical_issues', value)}
              placeholder="Descreva problemas que requerem atenção imediata"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.textAreaHint}>
              ⚠️ Liste problemas que requerem atenção imediata ou representam riscos de segurança
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recomendações Técnicas</Text>
            <Text style={styles.microcopy}>Sugestões para otimização e manutenção futura.</Text>
            <TextInput
              style={styles.textArea}
              value={formData.recommendations}
              onChangeText={(value) => updateFormData('recommendations', value)}
              placeholder="Recomendações para melhorias e manutenções"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.textAreaHint}>
              📋 Forneça recomendações técnicas para melhorias e manutenções
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ações Prioritárias</Text>
            <Text style={styles.microcopy}>Passos imediatos recomendados.</Text>
            <TextInput
              style={styles.textArea}
              value={formData.priority_actions}
              onChangeText={(value) => updateFormData('priority_actions', value)}
              placeholder="Ações que devem ser executadas prioritariamente"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.textAreaHint}>
              🚨 Defina ações que devem ser executadas prioritariamente
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('conclusion') && styles.labelError]}>
              Conclusão da Inspeção <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Resumo da avaliação e parecer técnico.</Text>
            <TextInput
              style={[styles.textArea, styles.conclusionTextArea, hasFieldError('conclusion') && styles.inputError]}
              value={formData.conclusion}
              onChangeText={(value) => updateFormData('conclusion', value)}
              placeholder="Conclusão final da inspeção técnica"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.textAreaHint}>
              💡 Descreva a avaliação final da instalação, incluindo conformidade com normas técnicas
            </Text>
            {hasFieldError('conclusion') && (
              <Text style={styles.errorText}>{getFieldError('conclusion')}</Text>
            )}
          </View>
        </View>

        {/* Reconnection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procedimentos de Religamento</Text>
          
          <View style={styles.booleanGroup}>
            <TouchableOpacity
              style={[
                styles.booleanItem,
                formData.reconnection_authorized && styles.booleanItemActive,
                hasFieldError('reconnection_authorized') && styles.booleanItemError,
              ]}
              onPress={() => updateFormData('reconnection_authorized', !formData.reconnection_authorized)}
            >
              <View style={styles.booleanLeft}>
                <View style={[
                  styles.checkbox,
                  formData.reconnection_authorized && styles.checkboxActive,
                ]}>
                  {formData.reconnection_authorized && <CheckCircle size={16} color="#ffffff" />}
                </View>
                <View style={styles.booleanText}>
                  <Text style={[styles.booleanLabel, hasFieldError('reconnection_authorized') && styles.labelError]}>
                    Religamento Autorizado <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.microcopy}>
                    Confirme que o religamento da instalação foi autorizado.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.booleanItem,
                formData.final_tests && styles.booleanItemActive,
                hasFieldError('final_tests') && styles.booleanItemError,
              ]}
              onPress={() => updateFormData('final_tests', !formData.final_tests)}
            >
              <View style={styles.booleanLeft}>
                <View style={[
                  styles.checkbox,
                  formData.final_tests && styles.checkboxActive,
                ]}>
                  {formData.final_tests && <CheckCircle size={16} color="#ffffff" />}
                </View>
                <View style={styles.booleanText}>
                  <Text style={[styles.booleanLabel, hasFieldError('final_tests') && styles.labelError]}>
                    Testes Finais Realizados <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.microcopy}>
                    Confirme a realização dos testes finais após a inspeção.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.booleanItem,
                formData.system_operational && styles.booleanItemActive,
                hasFieldError('system_operational') && styles.booleanItemError,
              ]}
              onPress={() => updateFormData('system_operational', !formData.system_operational)}
            >
              <View style={styles.booleanLeft}>
                <View style={[
                  styles.checkbox,
                  formData.system_operational && styles.checkboxActive,
                ]}>
                  {formData.system_operational && <CheckCircle size={16} color="#ffffff" />}
                </View>
                <View style={styles.booleanText}>
                  <Text style={[styles.booleanLabel, hasFieldError('system_operational') && styles.labelError]}>
                    Sistema Operacional <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.microcopy}>
                    Confirme se o sistema está operacional após a inspeção.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Horário do Religamento</Text>
            <Text style={styles.microcopy}>Horário em que o religamento foi efetuado.</Text>
            <View style={styles.inputContainer}>
              <Clock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.reconnection_time}
                onChangeText={(value) => updateFormData('reconnection_time', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações Finais</Text>
            <Text style={styles.microcopy}>Quaisquer notas adicionais sobre o processo de religamento.</Text>
            <TextInput
              style={styles.textArea}
              value={formData.final_observations}
              onChangeText={(value) => updateFormData('final_observations', value)}
              placeholder="Observações adicionais sobre o religamento e estado final"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Digital Signature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assinatura Digital</Text>
          
          <View style={styles.signatureContainer}>
            {signatureData ? (
              <View style={styles.signaturePreview}>
                <CheckCircle size={24} color="#10b981" />
                <Text style={styles.signatureText}>Assinatura capturada</Text>
                <TouchableOpacity
                  style={styles.resignButton}
                  onPress={handleSignature}
                >
                  <Text style={styles.resignButtonText}>Assinar Novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.signatureButton,
                  hasFieldError('signature') && styles.signatureButtonError,
                ]}
                onPress={handleSignature}
              >
                <PenTool size={24} color="#2563eb" />
                <Text style={styles.signatureButtonText}>Assinar Digitalmente</Text>
                <Text style={styles.signatureButtonSubtext}>
                  Toque para abrir o painel de assinatura
                </Text>
              </TouchableOpacity>
            )}
            
            {hasFieldError('signature') && (
              <Text style={styles.errorText}>{getFieldError('signature')}</Text>
            )}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo da Inspeção</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Shield size={20} color="#2563eb" />
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={styles.summaryValue}>
                {formData.compliance_status || 'Não definido'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.summaryLabel}>Condição</Text>
              <Text style={styles.summaryValue}>
                {formData.overall_condition || 'Não definido'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backToInspectionButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToInspectionButtonText}>Voltar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.finalizeButton,
            (saving || validationErrors.length > 0) && styles.finalizeButtonDisabled
          ]}
          onPress={handleSaveReview}
          disabled={saving || validationErrors.length > 0}
        >
          <FileText size={20} color="#ffffff" />
          <Text style={styles.finalizeButtonText}>
            {saving ? 'Salvando...' : 'Finalizar Inspeção'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Signature Modal would go here */}
      {/* This would integrate with react-native-signature-canvas */}
    </KeyboardAvoidingView>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressFields: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  labelError: {
    color: '#ef4444',
  },
  required: {
    color: '#ef4444',
  },
  microcopy: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
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
  conclusionTextArea: {
    minHeight: 150,
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
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
  selectOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#ffffff',
  },
  booleanGroup: {
    gap: 12,
  },
  booleanItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  booleanItemActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  booleanItemError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  booleanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  booleanText: {
    flex: 1,
  },
  booleanLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signaturePreview: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    width: '100%',
  },
  signatureText: {
    fontSize: 16,
    color: '#166534',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  resignButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resignButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  signatureButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    width: '100%',
  },
  signatureButtonError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  signatureButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 8,
  },
  signatureButtonSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center',
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
  backToInspectionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  backToInspectionButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  finalizeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  finalizeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  finalizeButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
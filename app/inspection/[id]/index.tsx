import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAuth } from '@/hooks/useAuth';
import { useReportGeneration, ValidationResult } from '@/hooks/useReportGeneration';
import { ExportHistory } from '@/components/inspection/ExportHistory';
import * as WebBrowser from 'expo-web-browser';
import { MODULE_CONFIGURATIONS } from '@/types/inspection';
import { ValidationSummary } from '@/components/forms/ValidationSummary';
import { ArrowLeft, MapPin, Calendar, User, Building, FileText, Camera, CircleCheck as CheckCircle, Circle, TriangleAlert as AlertTriangle, Download, Share, Settings, ClipboardCheck, X, History, Mail } from 'lucide-react-native';

interface InspectionDetail {
  id: string;
  clientName: string;
  workSite: string;
  address?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface ModuleProgress {
  moduleId: string;
  hasData: boolean;
  photoCount: number;
  isRequired: boolean;
}

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const { db } = useDatabase();
  const { user } = useAuth();
  const { generateReportWithOptions, validateFinalReport, loading: reportLoading } = useReportGeneration();

  useEffect(() => {
    if (db && id) {
      loadInspectionData();
    }
  }, [db, id]);

  useEffect(() => {
    // Executar validação quando a inspeção for carregada
    if (inspection && inspection.status === 'completed') {
      performValidation();
    }
  }, [inspection]);

  const performValidation = async () => {
    if (!id) return;
    
    try {
      const validation = await validateFinalReport(id);
      setValidationResult(validation);
    } catch (error) {
      console.error('Erro na validação:', error);
    }
  };

  const loadInspectionData = async () => {
    if (!db || !id) return;

    try {
      // Carregar dados da inspeção
      const inspectionResult = await db.getFirstAsync(
        'SELECT * FROM inspections WHERE id = ?',
        [id]
      );

      if (!inspectionResult) {
        Alert.alert('Erro', 'Inspeção não encontrada');
        router.back();
        return;
      }

      const inspectionData: InspectionDetail = {
        id: inspectionResult.id,
        clientName: inspectionResult.client_name,
        workSite: inspectionResult.work_site,
        address: inspectionResult.address,
        gpsLatitude: inspectionResult.gps_latitude,
        gpsLongitude: inspectionResult.gps_longitude,
        status: inspectionResult.status,
        progress: inspectionResult.progress || 0,
        createdAt: inspectionResult.created_at,
        updatedAt: inspectionResult.updated_at,
        userId: inspectionResult.user_id,
      };

      setInspection(inspectionData);

      // Carregar progresso dos módulos
      const moduleProgressData: ModuleProgress[] = [];
      
      for (const [moduleId, config] of Object.entries(MODULE_CONFIGURATIONS)) {
        // Verificar se há dados salvos para este módulo
        const moduleDataCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM module_data WHERE inspection_id = ? AND module_type = ?',
          [id, moduleId]
        );

        // Contar fotos do módulo
        const photoCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM media_files WHERE inspection_id = ? AND module_type = ? AND file_type LIKE "image/%"',
          [id, moduleId]
        );

        moduleProgressData.push({
          moduleId,
          hasData: (moduleDataCount?.count || 0) > 0,
          photoCount: photoCount?.count || 0,
          isRequired: config.required,
        });
      }

      setModuleProgress(moduleProgressData);
    } catch (error) {
      console.error('Erro ao carregar dados da inspeção:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da inspeção');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInspectionData();
    setRefreshing(false);
  };

  const handleModulePress = (moduleId: string) => {
    router.push(`/inspection/${id}/module/${moduleId}`);
  };

  const handleGenerateReport = async () => {
    if (!inspection) return;

    // Mostrar opções de geração diretamente
    showReportOptionsDialog();
  };

  const showReportOptionsDialog = () => {
    Alert.alert(
      'Opções de Relatório',
      'Escolha como gerar e entregar o relatório:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Gerar e Enviar por E-mail', 
          onPress: () => showEmailOptionsDialog()
        },
        { 
          text: 'Apenas Gerar PDF', 
          onPress: () => showReportModeSelection()
        },
      ]
    );
  };

  const showEmailOptionsDialog = () => {
    Alert.alert(
      'Envio por E-mail',
      'O relatório será gerado e enviado automaticamente por e-mail.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Padrão + E-mail', 
          onPress: () => executeReportGeneration('compatibility', true)
        },
        { 
          text: 'Enriquecido + E-mail', 
          onPress: () => executeReportGeneration('enriched', true)
        },
      ]
    );
  };

  const showReportModeSelection = () => {
    Alert.alert(
      'Tipo de Relatório',
      'Escolha o formato do relatório:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Padrão', 
          onPress: () => executeReportGeneration('compatibility', false)
        },
        { 
          text: 'Enriquecido', 
          onPress: () => executeReportGeneration('enriched', false)
        },
      ]
    );
  };

  const executeReportGeneration = async (mode: 'compatibility' | 'enriched', sendEmail: boolean = false) => {
    try {
      const result = await generateReportWithOptions(inspection!.id, {
        mode,
        send_email: sendEmail,
        include_json: true,
      });
      
      if (result.success) {
        const modeText = mode === 'enriched' ? 'enriquecido' : 'padrão';
        const emailText = sendEmail ? ' e enviado por e-mail' : '';
        
        Alert.alert(
          'Relatório Gerado',
          `O relatório PDF ${modeText} foi gerado com sucesso${emailText}!\n\nVersão: v${result.version}`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Abrir PDF', 
              onPress: () => WebBrowser.openBrowserAsync(result.pdf_url!) 
            },
            { 
              text: 'Ver Histórico', 
              onPress: () => setShowExportHistory(true)
            },
          ]
        );
      } else if (!result.success && result.validation_errors) {
        // Erro de validação - mostrar campos ausentes
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
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o relatório PDF');
      console.error('Erro na geração do relatório:', error);
    }
  };

  const showValidationDetails = (validationErrors: string[], criticalErrors?: string[]) => {
    const criticalSection = criticalErrors && criticalErrors.length > 0 
      ? `ERROS CRÍTICOS:\n${criticalErrors.map(e => `• ${e}`).join('\n')}\n\n`
      : '';
    
    const allErrors = validationErrors.slice(0, 10); // Limitar a 10 para não sobrecarregar
    const moreErrors = validationErrors.length > 10 ? `\n... e mais ${validationErrors.length - 10} item(s)` : '';
    
    Alert.alert(
      'Detalhes da Validação',
      `${criticalSection}CAMPOS AUSENTES:\n${allErrors.map(e => `• ${e}`).join('\n')}${moreErrors}`,
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'synced': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      case 'synced': return 'Sincronizada';
      default: return 'Desconhecido';
    }
  };

  const getModuleIcon = (moduleId: string) => {
    const iconMap: Record<string, any> = {
      'client': Building,
      'cabin_type': Settings,
      'procedures': ClipboardCheck,
      'maintenance': Settings,
      'transformers': Settings,
      'grid_connection': Settings,
      'mt': Settings,
      'bt': Settings,
      'epcs': Settings,
      'general_state': CheckCircle,
      'reconnection': Settings,
      'component_irregularities': AlertTriangle,
    };
    
    const IconComponent = iconMap[moduleId] || Circle;
    return IconComponent;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando inspeção...</Text>
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Inspeção não encontrada</Text>
        <TouchableOpacity
          style={styles.backToListButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToListButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedModules = moduleProgress.filter(m => m.hasData).length;
  const totalRequiredModules = moduleProgress.filter(m => m.isRequired).length;
  const overallProgress = totalRequiredModules > 0 ? Math.round((completedModules / totalRequiredModules) * 100) : 0;

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
        <Text style={styles.title}>Detalhes da Inspeção</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Inspection Info */}
        <View style={styles.inspectionCard}>
          <View style={styles.inspectionHeader}>
            <View style={styles.inspectionInfo}>
              <Text style={styles.clientName}>{inspection.clientName}</Text>
              <Text style={styles.workSite}>{inspection.workSite}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspection.status) }]}>
              <Text style={styles.statusText}>{getStatusText(inspection.status)}</Text>
            </View>
          </View>

          <View style={styles.inspectionDetails}>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#6b7280" />
              <Text style={styles.detailText}>{inspection.address || 'Endereço não informado'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Calendar size={16} color="#6b7280" />
              <Text style={styles.detailText}>
                Criada em {new Date(inspection.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <User size={16} color="#6b7280" />
              <Text style={styles.detailText}>ID: {inspection.id}</Text>
            </View>

            {inspection.gpsLatitude && inspection.gpsLongitude && (
              <View style={styles.detailRow}>
                <MapPin size={16} color="#10b981" />
                <Text style={styles.detailText}>
                  GPS: {inspection.gpsLatitude.toFixed(6)}, {inspection.gpsLongitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                Progresso: {overallProgress}% ({completedModules}/{totalRequiredModules} módulos)
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${overallProgress}%` }]} 
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Ações</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.validationButton}
              onPress={() => {
                performValidation();
                setShowValidation(true);
              }}
            >
              <ClipboardCheck size={20} color="#2563eb" />
              <Text style={styles.validationButtonText}>Validar Relatório</Text>
            </TouchableOpacity>

            {inspection.status === 'completed' && (
              <TouchableOpacity
                style={styles.reportButton}
                onPress={handleGenerateReport}
                disabled={reportLoading}
              >
                <Download size={20} color="#ffffff" />
                <Text style={styles.reportButtonText}>
                  {reportLoading ? 'Gerando PDF...' : 'Gerar Relatório PDF'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.checklistButton}
              onPress={() => router.push(`/inspection/${id}/checklist`)}
            >
              <ClipboardCheck size={20} color="#2563eb" />
              <Text style={styles.checklistButtonText}>Checklist Preventivo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/inspection/${id}/review-final`)}
            >
              <FileText size={20} color="#8b5cf6" />
              <Text style={styles.reviewButtonText}>Revisão Final</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setShowExportHistory(true)}
            >
              <History size={20} color="#8b5cf6" />
              <Text style={styles.historyButtonText}>Histórico de Exportações</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modules */}
        <View style={styles.modulesCard}>
          <Text style={styles.modulesTitle}>Módulos de Inspeção</Text>
          
          <View style={styles.modulesList}>
            {Object.entries(MODULE_CONFIGURATIONS).map(([moduleId, config]) => {
              const progress = moduleProgress.find(m => m.moduleId === moduleId);
              const IconComponent = getModuleIcon(moduleId);
              
              return (
                <TouchableOpacity
                  key={moduleId}
                  style={[
                    styles.moduleItem,
                    progress?.hasData && styles.moduleItemCompleted
                  ]}
                  onPress={() => handleModulePress(moduleId)}
                >
                  <View style={styles.moduleLeft}>
                    <View style={[
                      styles.moduleIcon,
                      progress?.hasData && styles.moduleIconCompleted
                    ]}>
                      <IconComponent 
                        size={20} 
                        color={progress?.hasData ? "#10b981" : "#6b7280"} 
                      />
                    </View>
                    
                    <View style={styles.moduleInfo}>
                      <Text style={[
                        styles.moduleTitle,
                        progress?.hasData && styles.moduleTitleCompleted
                      ]}>
                        {config.order}. {config.title}
                      </Text>
                      <Text style={styles.moduleDescription}>
                        {config.description}
                      </Text>
                      
                      {progress?.photoCount && progress.photoCount > 0 && (
                        <View style={styles.photoInfo}>
                          <Camera size={12} color="#6b7280" />
                          <Text style={styles.photoCount}>
                            {progress.photoCount} foto{progress.photoCount > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.moduleRight}>
                    {config.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Obrigatório</Text>
                      </View>
                    )}
                    
                    <View style={styles.moduleStatus}>
                      {progress?.hasData ? (
                        <CheckCircle size={24} color="#10b981" />
                      ) : (
                        <Circle size={24} color="#d1d5db" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{completedModules}</Text>
              <Text style={styles.summaryLabel}>Módulos Concluídos</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {moduleProgress.reduce((sum, m) => sum + m.photoCount, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Fotos Capturadas</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryNumber,
                { color: overallProgress === 100 ? '#10b981' : '#f59e0b' }
              ]}>
                {overallProgress}%
              </Text>
              <Text style={styles.summaryLabel}>Progresso</Text>
            </View>
          </View>

          {overallProgress === 100 && inspection.status !== 'completed' && (
            <View style={styles.completionNotice}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.completionText}>
                Todos os módulos obrigatórios foram preenchidos! A inspeção pode ser finalizada.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Validation Modal */}
      <Modal
        visible={showValidation}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.validationModal}>
          <View style={styles.validationHeader}>
            <Text style={styles.validationTitle}>Validação do Relatório</Text>
            <TouchableOpacity
              style={styles.closeValidationButton}
              onPress={() => setShowValidation(false)}
            >
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.validationContent}>
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
                showReportButton={true}
                reportButtonText="Gerar Relatório Mesmo Assim"
                onGenerateReport={() => {
                  setShowValidation(false);
                  showReportModeSelection();
                }}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Export History Modal */}
      <Modal
        visible={showExportHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ExportHistory
          inspectionId={id}
          visible={showExportHistory}
          onClose={() => setShowExportHistory(false)}
        />
        <TouchableOpacity
          style={styles.closeHistoryButton}
          onPress={() => setShowExportHistory(false)}
        >
          <Text style={styles.closeHistoryButtonText}>Fechar</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToListButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inspectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inspectionInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  workSite: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  inspectionDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  progressContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  progressHeader: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  validationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  validationButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  checklistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  checklistButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    gap: 8,
  },
  historyButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    gap: 8,
  },
  reviewButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  modulesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  modulesList: {
    gap: 12,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  moduleItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  moduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleIconCompleted: {
    backgroundColor: '#dcfce7',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  moduleTitleCompleted: {
    color: '#166534',
  },
  moduleDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 18,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  photoCount: {
    fontSize: 11,
    color: '#6b7280',
  },
  moduleRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '600',
  },
  moduleStatus: {
    // Status icon container
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
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  completionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  validationModal: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  validationHeader: {
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
  validationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeValidationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationContent: {
    flex: 1,
    padding: 20,
  },
  closeHistoryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeHistoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
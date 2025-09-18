import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import * as WebBrowser from 'expo-web-browser';
import { FileText, Download, Mail, Clock, CircleCheck as CheckCircle, Circle as XCircle, RefreshCw, ExternalLink, TriangleAlert as AlertTriangle, Calendar, User } from 'lucide-react-native';

interface ExportHistoryProps {
  inspectionId: string;
  visible?: boolean;
  onClose?: () => void;
}

interface ExportLogEntry {
  id: string;
  report_type: string;
  file_name: string;
  version: number;
  exported_at: string;
  uploaded_at?: string;
  email_sent_at?: string;
  email_delivered_at?: string;
  recipient_emails: string[];
  status: string;
  error_message?: string;
  retry_count: number;
  metadata: any;
}

export const ExportHistory: React.FC<ExportHistoryProps> = ({
  inspectionId,
  visible = true,
  onClose,
}) => {
  const [exportHistory, setExportHistory] = useState<ExportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getExportHistory, retryFailedExport } = useReportGeneration();

  useEffect(() => {
    if (visible && inspectionId) {
      loadExportHistory();
    }
  }, [visible, inspectionId]);

  const loadExportHistory = async () => {
    try {
      const history = await getExportHistory(inspectionId);
      setExportHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de exportações');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExportHistory();
    setRefreshing(false);
  };

  const handleOpenReport = async (entry: ExportLogEntry) => {
    if (entry.status !== 'success' || !entry.uploaded_at) {
      Alert.alert('Aviso', 'Este relatório ainda não foi gerado com sucesso');
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const reportUrl = `${supabaseUrl}/storage/v1/object/public/reports/${entry.file_name}`;
      
      await WebBrowser.openBrowserAsync(reportUrl);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o relatório');
    }
  };

  const handleRetryExport = async (entry: ExportLogEntry) => {
    Alert.alert(
      'Tentar Novamente',
      `Deseja tentar novamente a exportação da versão ${entry.version}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Tentar Novamente', 
          onPress: async () => {
            const success = await retryFailedExport(entry.id);
            if (success) {
              Alert.alert('Sucesso', 'Retry iniciado com sucesso');
              await loadExportHistory();
            } else {
              Alert.alert('Erro', 'Não foi possível iniciar o retry');
            }
          }
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} color="#10b981" />;
      case 'failed': return <XCircle size={20} color="#ef4444" />;
      case 'pending': return <Clock size={20} color="#f59e0b" />;
      case 'uploaded': return <Download size={20} color="#3b82f6" />;
      case 'sending_email': return <Mail size={20} color="#8b5cf6" />;
      default: return <AlertTriangle size={20} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'failed': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'uploaded': return '#3b82f6';
      case 'sending_email': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Sucesso';
      case 'failed': return 'Falhou';
      case 'pending': return 'Pendente';
      case 'uploaded': return 'Carregado';
      case 'sending_email': return 'Enviando E-mail';
      default: return 'Desconhecido';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Exportações</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <RefreshCw size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : exportHistory.length > 0 ? (
          exportHistory.map((entry) => (
            <View key={entry.id} style={styles.exportCard}>
              <View style={styles.exportHeader}>
                <View style={styles.exportInfo}>
                  <View style={styles.exportTitleRow}>
                    <FileText size={16} color="#1f2937" />
                    <Text style={styles.exportTitle}>
                      {entry.file_name}
                    </Text>
                    <View style={styles.versionBadge}>
                      <Text style={styles.versionText}>v{entry.version}</Text>
                    </View>
                  </View>
                  <Text style={styles.exportSubtitle}>
                    {entry.report_type} • {formatDateTime(entry.exported_at)}
                  </Text>
                </View>
                
                <View style={styles.exportStatus}>
                  {getStatusIcon(entry.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                    {getStatusText(entry.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.exportDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={14} color="#6b7280" />
                  <Text style={styles.detailText}>
                    Exportado: {formatDateTime(entry.exported_at)}
                  </Text>
                </View>
                
                {entry.uploaded_at && (
                  <View style={styles.detailRow}>
                    <Download size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      Upload: {formatDateTime(entry.uploaded_at)}
                    </Text>
                  </View>
                )}
                
                {entry.email_sent_at && (
                  <View style={styles.detailRow}>
                    <Mail size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      E-mail: {formatDateTime(entry.email_sent_at)}
                    </Text>
                  </View>
                )}
                
                {entry.recipient_emails?.length > 0 && (
                  <View style={styles.detailRow}>
                    <User size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      Destinatários: {entry.recipient_emails.join(', ')}
                    </Text>
                  </View>
                )}
                
                {entry.retry_count > 0 && (
                  <View style={styles.detailRow}>
                    <RefreshCw size={14} color="#f59e0b" />
                    <Text style={styles.detailText}>
                      Tentativas: {entry.retry_count}
                    </Text>
                  </View>
                )}
              </View>

              {entry.error_message && (
                <View style={styles.errorContainer}>
                  <AlertTriangle size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{entry.error_message}</Text>
                </View>
              )}

              <View style={styles.exportActions}>
                {entry.status === 'success' && entry.uploaded_at && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenReport(entry)}
                  >
                    <ExternalLink size={16} color="#2563eb" />
                    <Text style={styles.actionButtonText}>Abrir</Text>
                  </TouchableOpacity>
                )}
                
                {entry.status === 'failed' && entry.retry_count < 5 && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => handleRetryExport(entry)}
                  >
                    <RefreshCw size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>Nenhuma exportação encontrada</Text>
            <Text style={styles.emptyStateSubtext}>
              Os relatórios gerados aparecerão aqui
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  exportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  versionBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
  exportSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  exportStatus: {
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  exportDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 16,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
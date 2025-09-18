import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useWebhookNotifications } from '@/hooks/useWebhookNotifications';
import { Wifi, WifiOff, TestTube, Settings, CircleCheck as CheckCircle, CircleX as XCircle, Activity, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface WebhookConfig {
  name: string;
  description: string;
  enabled: boolean;
  url?: string;
  platforms?: Record<string, { url: string; enabled: boolean }>;
  events: string[];
  trigger: string;
}

interface QueueStats {
  pending?: number;
  processing?: number;
  done?: number;
  failed?: number;
  dead?: number;
}

interface RecentLog {
  event_type: string;
  response_status: number | null;
  created_at: string;
}

interface WebhookStatusProps {
  visible?: boolean;
  onClose?: () => void;
}

export const WebhookStatus: React.FC<WebhookStatusProps> = ({
  visible = true,
  onClose,
}) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  
  const notifications = useWebhookNotifications();

  useEffect(() => {
    if (visible) {
      loadWebhookStatus();
    }
  }, [visible]);

  const loadWebhookStatus = async () => {
    try {
      const status = await notifications.getWebhookStatus();
      setWebhooks(status.webhooks || []);
      setQueueStats(status.queue_statistics || {});
      setRecentLogs(status.recent_logs || []);
    } catch (error) {
      console.error('Erro ao carregar status dos webhooks:', error);
      Alert.alert('Erro', 'Não foi possível carregar o status dos webhooks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWebhookStatus();
    setRefreshing(false);
  };

  const testWebhook = async (webhookName: string) => {
    setTesting(webhookName);
    
    try {
      const result = await notifications.testWebhookConfiguration(webhookName);
      
      if (result.success) {
        Alert.alert(
          'Teste Bem-sucedido',
          `Webhook ${webhookName} testado com sucesso!\n\nStatus: ${result.response_status}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Teste Falhou',
          `Erro no teste do webhook ${webhookName}:\n\n${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Erro', `Não foi possível testar o webhook: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const getStatusIcon = (webhook: WebhookConfig) => {
    if (webhook.enabled) {
      return <CheckCircle size={20} color="#10b981" />;
    } else {
      return <XCircle size={20} color="#ef4444" />;
    }
  };

  const getStatusColor = (webhook: WebhookConfig) => {
    return webhook.enabled ? '#10b981' : '#ef4444';
  };

  const getTotalQueueItems = () => {
    return Object.values(queueStats).reduce((sum, count) => sum + (count || 0), 0);
  };

  if (!visible) return null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Status dos Webhooks</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Settings size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Queue Statistics */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Estatísticas da Fila</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Clock size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{queueStats.pending || 0}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statItem}>
            <Activity size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>{queueStats.processing || 0}</Text>
            <Text style={styles.statLabel}>Processando</Text>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.statNumber}>{queueStats.done || 0}</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
          <View style={styles.statItem}>
            <AlertTriangle size={24} color="#ef4444" />
            <Text style={styles.statNumber}>{queueStats.failed || 0}</Text>
            <Text style={styles.statLabel}>Falharam</Text>
          </View>
        </View>
        <Text style={styles.totalItems}>
          Total de itens na fila: {getTotalQueueItems()}
        </Text>
      </View>

      {/* Webhooks */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando configuração...</Text>
        </View>
      ) : (
        webhooks.map((webhook) => (
          <View key={webhook.name} style={styles.webhookCard}>
            <View style={styles.webhookHeader}>
              <View style={styles.webhookInfo}>
                <View style={styles.webhookTitleRow}>
                  {getStatusIcon(webhook)}
                  <Text style={styles.webhookName}>{webhook.name}</Text>
                </View>
                <Text style={styles.webhookDescription}>{webhook.description}</Text>
              </View>
              
              <TouchableOpacity
                style={[styles.testButton, testing === webhook.name && styles.testButtonDisabled]}
                onPress={() => testWebhook(webhook.name)}
                disabled={testing === webhook.name || !webhook.enabled}
              >
                <TestTube size={16} color="#ffffff" />
                <Text style={styles.testButtonText}>
                  {testing === webhook.name ? 'Testando...' : 'Testar'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.webhookDetails}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, { color: getStatusColor(webhook) }]}>
                {webhook.enabled ? 'Ativo' : 'Inativo'}
              </Text>
            </View>

            <View style={styles.webhookDetails}>
              <Text style={styles.detailLabel}>Eventos:</Text>
              <Text style={styles.detailValue}>{webhook.events.join(', ')}</Text>
            </View>

            <View style={styles.webhookDetails}>
              <Text style={styles.detailLabel}>Trigger:</Text>
              <Text style={styles.detailValue}>{webhook.trigger}</Text>
            </View>

            {webhook.platforms && (
              <View style={styles.platformsContainer}>
                <Text style={styles.platformsTitle}>Plataformas:</Text>
                {Object.entries(webhook.platforms).map(([platform, config]) => (
                  <View key={platform} style={styles.platformItem}>
                    <Text style={styles.platformName}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}:
                    </Text>
                    <View style={styles.platformStatus}>
                      {config.enabled ? (
                        <CheckCircle size={16} color="#10b981" />
                      ) : (
                        <XCircle size={16} color="#ef4444" />
                      )}
                      <Text style={[
                        styles.platformStatusText,
                        { color: config.enabled ? '#10b981' : '#ef4444' }
                      ]}>
                        {config.enabled ? 'Configurado' : 'Não configurado'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}

      {/* Recent Logs */}
      <View style={styles.logsCard}>
        <Text style={styles.logsTitle}>Logs Recentes</Text>
        {recentLogs.length > 0 ? (
          recentLogs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View style={styles.logInfo}>
                <Text style={styles.logEventType}>{log.event_type}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </Text>
              </View>
              <View style={[
                styles.logStatus,
                { backgroundColor: getLogStatusColor(log.response_status) }
              ]}>
                <Text style={styles.logStatusText}>
                  {log.response_status || 'ERRO'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noLogsText}>Nenhum log recente encontrado</Text>
        )}
      </View>

      {/* Setup Instructions */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Como Configurar</Text>
        <Text style={styles.infoText}>
          1. Acesse o Supabase Dashboard → Edge Functions → Environment Variables
        </Text>
        <Text style={styles.infoText}>
          2. Configure as URLs e chaves dos sistemas externos
        </Text>
        <Text style={styles.infoText}>
          3. Deploy das Edge Functions (automático no Bolt)
        </Text>
        <Text style={styles.infoText}>
          4. Execute a migration SQL no SQL Editor
        </Text>
        <Text style={styles.infoText}>
          5. Configure cron job para processar a fila periodicamente
        </Text>
      </View>
    </ScrollView>
  );
};

function getLogStatusColor(status: number | null): string {
  if (!status) return '#ef4444';
  if (status >= 200 && status < 300) return '#10b981';
  if (status >= 400 && status < 500) return '#f59e0b';
  return '#ef4444';
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
  statsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  totalItems: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  webhookCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webhookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  webhookInfo: {
    flex: 1,
  },
  webhookTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  webhookName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  webhookDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  testButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  webhookDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  platformsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  platformsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  platformName: {
    fontSize: 12,
    color: '#6b7280',
  },
  platformStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  platformStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  logsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logInfo: {
    flex: 1,
  },
  logEventType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  logTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  logStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  noLogsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#3730a3',
    marginBottom: 4,
  },
});
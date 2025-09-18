import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Wifi, WifiOff, TestTube, Settings, CircleCheck as CheckCircle, CircleX as XCircle } from 'lucide-react-native';

interface WebhookConfig {
  name: string;
  description: string;
  enabled: boolean;
  url?: string;
  platforms?: Record<string, { url: string; enabled: boolean }>;
  events: string[];
  trigger: string;
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
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadWebhookConfig();
    }
  }, [visible]);

  const loadWebhookConfig = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase configuration not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/webhook-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok) {
        const config = await response.json();
        setWebhooks(config.webhooks || []);
      }
    } catch (error) {
      console.error('Error loading webhook config:', error);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (webhookName: string) => {
    setTesting(webhookName);
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        Alert.alert('Erro', 'Configuração do Supabase não encontrada');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/webhook-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          webhook_name: webhookName,
          test_data: getTestData(webhookName),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Sucesso', `Webhook ${webhookName} testado com sucesso!`);
      } else {
        Alert.alert('Erro', `Falha no teste: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível testar o webhook');
    } finally {
      setTesting(null);
    }
  };

  const getTestData = (webhookName: string) => {
    switch (webhookName) {
      case 'external_os_integration':
        return {
          os_number: 'TEST-OS-' + Date.now(),
          inspection_id: 'test_inspection',
          fault_id: 'test_fault',
          description: 'Test work order for webhook validation',
          priority: 'urgent',
          estimated_cost: 1000,
          created_at: new Date().toISOString(),
        };
      case 'notification_webhook':
        return {
          type: 'test_alert',
          message: 'Test notification from webhook system',
          recipients: ['test_user'],
          urgency: 'medium',
          inspection_id: 'test_inspection',
          fault_id: 'test_fault',
        };
      case 'cost_tracking_webhook':
        return {
          fault_id: 'test_fault_' + Date.now(),
          inspection_id: 'test_inspection',
          descricao: 'Test corrective action for cost tracking',
          criticidade: 'alta',
          custo_estimado: 1500,
          status: 'pendente',
          data_deteccao: new Date().toISOString(),
        };
      default:
        return {};
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

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Status dos Webhooks</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadWebhookConfig}>
          <Settings size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
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

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Como Configurar</Text>
          <Text style={styles.infoText}>
            1. Acesse o Supabase Dashboard
          </Text>
          <Text style={styles.infoText}>
            2. Vá em Edge Functions → Environment Variables
          </Text>
          <Text style={styles.infoText}>
            3. Configure as URLs e chaves dos sistemas externos
          </Text>
          <Text style={styles.infoText}>
            4. Deploy das Edge Functions (automático no Bolt)
          </Text>
          <Text style={styles.infoText}>
            5. Configure os triggers no SQL Editor
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
  webhookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  infoCard: {
    backgroundColor: '#eff6ff',
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
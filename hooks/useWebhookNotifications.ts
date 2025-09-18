import { useCallback } from 'react';

interface NotificationData {
  type: string;
  message: string;
  recipients: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  inspection_id?: string;
  fault_id?: string;
}

export const useWebhookNotifications = () => {
  const sendNotification = useCallback(async (notificationData: NotificationData): Promise<boolean> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Configuração do Supabase não encontrada para notificações');
        return false;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro no webhook de notificação:', errorText);
        return false;
      }

      const result = await response.json();
      console.log('Notificação enviada com sucesso:', result);
      return result.success;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }, []);

  const notifyCriticalIssue = useCallback(async (
    description: string,
    inspectionId: string,
    faultId: string
  ): Promise<boolean> => {
    return await sendNotification({
      type: 'critical_alert',
      message: `Problema crítico detectado: ${description}`,
      recipients: ['supervisor', 'maintenance_team'],
      urgency: 'high',
      inspection_id: inspectionId,
      fault_id: faultId,
    });
  }, [sendNotification]);

  const notifyMeasurementOutOfRange = useCallback(async (
    itemName: string,
    measuredValue: number,
    expectedValue: string,
    unit: string,
    inspectionId: string
  ): Promise<boolean> => {
    return await sendNotification({
      type: 'measurement_alert',
      message: `Medição fora da faixa: ${itemName} = ${measuredValue} ${unit} (esperado: ${expectedValue})`,
      recipients: ['inspector', 'supervisor'],
      urgency: 'medium',
      inspection_id: inspectionId,
      data: {
        item_name: itemName,
        measured_value: measuredValue,
        expected_value: expectedValue,
        unit: unit,
      },
    });
  }, [sendNotification]);

  const notifySafetyIssue = useCallback(async (
    description: string,
    criticality: string,
    inspectionId: string,
    faultId: string
  ): Promise<boolean> => {
    return await sendNotification({
      type: 'safety_alert',
      message: `Problema de segurança: ${description}`,
      recipients: ['safety_officer', 'supervisor'],
      urgency: criticality === 'alta' ? 'high' : 'medium',
      inspection_id: inspectionId,
      fault_id: faultId,
      data: {
        criticality: criticality,
      },
    });
  }, [sendNotification]);

  const notifyStructuralSafetyIssue = useCallback(async (
    description: string,
    inspectionId: string,
    faultId: string
  ): Promise<boolean> => {
    return await sendNotification({
      type: 'structural_safety_alert',
      message: `Problema estrutural crítico: ${description}`,
      recipients: ['structural_engineer', 'supervisor'],
      urgency: 'critical',
      inspection_id: inspectionId,
      fault_id: faultId,
    });
  }, [sendNotification]);

  const testWebhookConfiguration = useCallback(async (webhookName: string): Promise<any> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/webhook-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ webhook_name: webhookName }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      throw error;
    }
  }, []);

  const getWebhookStatus = useCallback(async (): Promise<any> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/webhook-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao obter status dos webhooks:', error);
      throw error;
    }
  }, []);

  return {
    sendNotification,
    notifyCriticalIssue,
    notifyMeasurementOutOfRange,
    notifySafetyIssue,
    notifyStructuralSafetyIssue,
    testWebhookConfiguration,
    getWebhookStatus,
  };
};
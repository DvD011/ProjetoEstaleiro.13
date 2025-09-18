import { useState, useEffect } from 'react';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useWebhookNotifications } from './useWebhookNotifications';
import { 
  ChecklistItem, 
  CorrectiveAction, 
  getChecklistForCabinType,
  createCorrectiveAction,
  validateMeasurement,
  shouldGenerateOS,
  TRIGGER_RULES
} from '@/types/checklist';

export interface ChecklistExecution {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  status: 'pending' | 'completed' | 'failed' | 'na';
  measured_value?: number;
  observation: string;
  photo_uris: string[];
  executed_at?: string;
  executed_by: string;
  validation_result?: {
    isValid: boolean;
    deviation: number;
    message: string;
  };
}

export const usePreventiveChecklist = (inspectionId: string) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [executions, setExecutions] = useState<ChecklistExecution[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [cabinType, setCabinType] = useState<string>('');
  const { db } = useDatabase();
  const notifications = useWebhookNotifications();

  useEffect(() => {
    if (db && inspectionId) {
      loadChecklistData();
    }
  }, [db, inspectionId]);

  const loadChecklistData = async () => {
    if (!db) return;

    setLoading(true);
    try {
      // Buscar tipo de cabine da inspeção
      const cabinTypeResult = await db.getFirstAsync(
        'SELECT field_value FROM module_data WHERE inspection_id = ? AND module_type = ? AND field_name = ?',
        [inspectionId, 'cabin_type', 'cabin_type']
      );

      const detectedCabinType = cabinTypeResult?.field_value || 'CONVENCIONAL';
      setCabinType(detectedCabinType);

      // Carregar template do checklist
      const template = getChecklistForCabinType(detectedCabinType);
      if (template) {
        setChecklistItems(template.items);
      }

      // Carregar execuções existentes
      const executionsResult = await db.getAllAsync(
        'SELECT * FROM checklist_executions WHERE inspection_id = ? ORDER BY executed_at DESC',
        [inspectionId]
      );

      const executionsList = executionsResult.map((row: any) => ({
        id: row.id,
        inspection_id: row.inspection_id,
        checklist_item_id: row.checklist_item_id,
        status: row.status,
        measured_value: row.measured_value,
        observation: row.observation || '',
        photo_uris: JSON.parse(row.photo_uris || '[]'),
        executed_at: row.executed_at,
        executed_by: row.executed_by,
        validation_result: row.validation_result ? JSON.parse(row.validation_result) : undefined,
      }));

      setExecutions(executionsList);

      // Carregar ações corretivas
      const correctiveResult = await db.getAllAsync(
        'SELECT * FROM corrective_actions WHERE inspection_id = ? ORDER BY data_deteccao DESC',
        [inspectionId]
      );

      const correctiveList = correctiveResult.map((row: any) => ({
        fault_id: row.fault_id,
        linked_checklist_id: row.linked_checklist_id,
        descricao: row.descricao,
        criticidade: row.criticidade,
        acao_tomada: row.acao_tomada,
        materiais_usados: JSON.parse(row.materiais_usados || '[]'),
        custo_estimado: row.custo_estimado || 0,
        fotos_before: JSON.parse(row.fotos_before || '[]'),
        fotos_after: JSON.parse(row.fotos_after || '[]'),
        data_deteccao: row.data_deteccao,
        data_correcao: row.data_correcao,
        responsavel: row.responsavel || '',
        status: row.status,
        os_gerada: row.os_gerada,
        observacoes: row.observacoes,
      }));

      setCorrectiveActions(correctiveList);

    } catch (error) {
      console.error('Erro ao carregar dados do checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeChecklistItem = async (
    itemId: string,
    observation: string,
    measuredValue?: number,
    photoUris: string[] = [],
    executedBy: string = 'current_user'
  ): Promise<boolean> => {
    if (!db) return false;

    try {
      const item = checklistItems.find(i => i.id === itemId);
      if (!item) throw new Error('Item do checklist não encontrado');

      // Validar medição se aplicável
      let validationResult;
      if (measuredValue !== undefined && item.valor_esperado) {
        validationResult = validateMeasurement(item, measuredValue);
        
        // Send notification if measurement is out of range
        if (!validationResult.isValid) {
          await notifications.notifyMeasurementOutOfRange(
            item.acao_curta,
            measuredValue,
            item.valor_esperado,
            item.unidade || '',
            inspectionId
          );
        }
      }

      // Determinar status baseado na validação
      let status: ChecklistExecution['status'] = 'completed';
      if (validationResult && !validationResult.isValid) {
        status = 'failed';
      }

      const executionId = generateId();
      const now = new Date().toISOString();

      // Salvar execução
      await db.runAsync(
        `INSERT INTO checklist_executions 
         (id, inspection_id, checklist_item_id, status, measured_value, observation, photo_uris, executed_at, executed_by, validation_result)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          executionId,
          inspectionId,
          itemId,
          status,
          measuredValue || null,
          observation,
          JSON.stringify(photoUris),
          now,
          executedBy,
          validationResult ? JSON.stringify(validationResult) : null,
        ]
      );

      // Se falhou na validação, criar ação corretiva automaticamente
      if (status === 'failed' && validationResult) {
        const faultId = await createAutomaticCorrectiveAction(itemId, validationResult.message, item.criticidade);
        
        // Enviar notificações apropriadas baseadas na categoria e criticidade do item
        if (faultId) {
          // Notificação para problemas de segurança
          if (item.categoria === 'seguranca' && item.criticidade !== 'baixa') {
            await notifications.notifySafetyIssue(
              validationResult.message,
              item.criticidade,
              inspectionId,
              faultId
            );
          // Notificação para problemas estruturais críticos
          } else if (item.equipment_type === 'poste' && item.criticidade === 'alta') {
            await notifications.notifyStructuralSafetyIssue(
              validationResult.message,
              inspectionId,
              faultId
            );
          // Notificação para problemas críticos gerais
          } else if (item.criticidade === 'alta') {
            await notifications.notifyCriticalIssue(
              validationResult.message,
              inspectionId,
              faultId
            );
          }
        }
      }

      await loadChecklistData();
      return true;
    } catch (error) {
      console.error('Erro ao executar item do checklist:', error);
      return false;
    }
  };

  const createAutomaticCorrectiveAction = async (
    checklistItemId: string,
    description: string,
    criticality: 'baixa' | 'media' | 'alta'
  ): Promise<string | null> => {
    if (!db) return null;

    try {
      const correctiveAction = createCorrectiveAction(checklistItemId, description, criticality);
      
      await db.runAsync(
        `INSERT INTO corrective_actions 
         (fault_id, inspection_id, linked_checklist_id, descricao, criticidade, acao_tomada, 
          materiais_usados, custo_estimado, fotos_before, fotos_after, data_deteccao, responsavel, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          correctiveAction.fault_id,
          inspectionId,
          correctiveAction.linked_checklist_id,
          correctiveAction.descricao,
          correctiveAction.criticidade,
          correctiveAction.acao_tomada,
          JSON.stringify(correctiveAction.materiais_usados),
          correctiveAction.custo_estimado,
          JSON.stringify(correctiveAction.fotos_before),
          JSON.stringify(correctiveAction.fotos_after),
          correctiveAction.data_deteccao,
          correctiveAction.responsavel,
          correctiveAction.status,
        ]
      );

      // Verificar se deve gerar OS automaticamente
      if (shouldGenerateOS(correctiveAction)) {
        await generateWorkOrder(correctiveAction.fault_id);
        
        // Enviar notificação de problema crítico quando OS é gerada
        await notifications.notifyCriticalIssue(
          correctiveAction.descricao,
          inspectionId,
          correctiveAction.fault_id
        );
      }

      // NOVO: Notificação específica para ações corretivas de alta criticidade com fotos
      if (correctiveAction.criticidade === 'alta' && 
          correctiveAction.fotos_before.length > 0) {
        await notifications.notifyCriticalIssue(
          `Ação corretiva crítica criada: ${correctiveAction.descricao}`,
          inspectionId,
          correctiveAction.fault_id
        );
        
        console.log(`Notificação enviada para ação corretiva crítica: ${correctiveAction.fault_id}`);
      }

      return correctiveAction.fault_id;
    } catch (error) {
      console.error('Erro ao criar ação corretiva:', error);
      return null;
    }
  };

  const updateCorrectiveAction = async (
    faultId: string,
    updates: Partial<CorrectiveAction>
  ): Promise<boolean> => {
    if (!db) return false;

    try {
      const updateFields = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'faultId' ? 'fault_id' : 
                       key === 'linkedChecklistId' ? 'linked_checklist_id' :
                       key === 'acaoTomada' ? 'acao_tomada' :
                       key === 'materiaisUsados' ? 'materiais_usados' :
                       key === 'custoEstimado' ? 'custo_estimado' :
                       key === 'fotosBefore' ? 'fotos_before' :
                       key === 'fotosAfter' ? 'fotos_after' :
                       key === 'dataDeteccao' ? 'data_deteccao' :
                       key === 'dataCorrecao' ? 'data_correcao' :
                       key === 'osGerada' ? 'os_gerada' :
                       key;

          updateFields.push(`${dbKey} = ?`);
          
          if (Array.isArray(value)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (updateFields.length > 0) {
        values.push(faultId);
        await db.runAsync(
          `UPDATE corrective_actions SET ${updateFields.join(', ')} WHERE fault_id = ?`,
          values
        );
      }

      await loadChecklistData();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar ação corretiva:', error);
      return false;
    }
  };

  const generateWorkOrder = async (faultId: string): Promise<string | null> => {
    if (!db) return null;

    try {
      const correctiveAction = correctiveActions.find(ca => ca.fault_id === faultId);
      if (!correctiveAction) return null;

      const osNumber = `OS-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Salvar OS no banco
      await db.runAsync(
        `INSERT INTO work_orders 
         (os_number, inspection_id, fault_id, description, priority, estimated_cost, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          osNumber,
          inspectionId,
          faultId,
          correctiveAction.descricao,
          correctiveAction.criticidade === 'alta' ? 'urgent' : 
          correctiveAction.criticidade === 'media' ? 'normal' : 'low',
          correctiveAction.custo_estimado,
          'pending',
          new Date().toISOString(),
        ]
      );

      // Atualizar ação corretiva com número da OS
      await updateCorrectiveAction(faultId, { os_gerada: osNumber });

      console.log(`OS gerada automaticamente: ${osNumber} para fault ${faultId}`);
      return osNumber;
    } catch (error) {
      console.error('Erro ao gerar OS:', error);
      return null;
    }
  };

  const getChecklistProgress = (): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    percentage: number;
  } => {
    const total = checklistItems.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const pending = total - completed - failed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, failed, pending, percentage };
  };

  const getItemsRequiringCorrection = (): ChecklistItem[] => {
    const failedExecutions = executions.filter(e => e.status === 'failed');
    return checklistItems.filter(item => 
      failedExecutions.some(exec => exec.checklist_item_id === item.id)
    );
  };

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  return {
    checklistItems,
    executions,
    correctiveActions,
    loading,
    cabinType,
    executeChecklistItem,
    updateCorrectiveAction,
    createAutomaticCorrectiveAction,
    generateWorkOrder,
    getChecklistProgress,
    getItemsRequiringCorrection,
    refreshData: loadChecklistData,
  };
};
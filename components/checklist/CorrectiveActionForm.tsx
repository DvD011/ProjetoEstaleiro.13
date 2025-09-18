import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CorrectiveAction } from '@/types/checklist';
import { ArrowLeft, Save, X, TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface CorrectiveActionFormProps {
  checklistItemId: string;
  onSave: (action: CorrectiveAction) => Promise<boolean>;
  onCancel: () => void;
  initialData?: Partial<CorrectiveAction>;
}

export const CorrectiveActionForm: React.FC<CorrectiveActionFormProps> = ({
  checklistItemId,
  onSave,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    descricao: initialData?.descricao || '',
    criticidade: initialData?.criticidade || 'media' as 'baixa' | 'media' | 'alta',
    acao_tomada: initialData?.acao_tomada || 'temporaria' as 'temporaria' | 'permanente',
    materiais_usados: initialData?.materiais_usados?.join(', ') || '',
    custo_estimado: initialData?.custo_estimado?.toString() || '0',
    responsavel: initialData?.responsavel || '',
    observacoes: initialData?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.descricao.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const action: CorrectiveAction = {
        fault_id: initialData?.fault_id || `fault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        linked_checklist_id: checklistItemId,
        descricao: formData.descricao.trim(),
        criticidade: formData.criticidade,
        acao_tomada: formData.acao_tomada,
        materiais_usados: formData.materiais_usados.split(',').map(m => m.trim()).filter(m => m),
        custo_estimado: parseFloat(formData.custo_estimado) || 0,
        fotos_before: initialData?.fotos_before || [],
        fotos_after: initialData?.fotos_after || [],
        data_deteccao: initialData?.data_deteccao || new Date().toISOString(),
        data_correcao: initialData?.data_correcao,
        responsavel: formData.responsavel.trim(),
        status: initialData?.status || 'pendente',
        os_gerada: initialData?.os_gerada,
        observacoes: formData.observacoes.trim(),
      };

      const success = await onSave(action);
      if (success) {
        Alert.alert('Sucesso', 'Ação corretiva salva com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a ação corretiva');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar ação corretiva');
    } finally {
      setSaving(false);
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'alta': return '#ef4444';
      case 'media': return '#f59e0b';
      case 'baixa': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Ação Corretiva</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Alert */}
        <View style={styles.alertContainer}>
          <AlertTriangle size={20} color="#f59e0b" />
          <Text style={styles.alertText}>
            Documente a ação corretiva necessária para resolver o problema identificado
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Descrição do Problema <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={formData.descricao}
              onChangeText={(value) => updateFormData('descricao', value)}
              placeholder="Descreva detalhadamente o problema encontrado..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Criticidade</Text>
            <View style={styles.criticalityContainer}>
              {(['baixa', 'media', 'alta'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.criticalityButton,
                    formData.criticidade === level && {
                      backgroundColor: getCriticalityColor(level),
                      borderColor: getCriticalityColor(level),
                    },
                  ]}
                  onPress={() => updateFormData('criticidade', level)}
                >
                  <Text
                    style={[
                      styles.criticalityText,
                      formData.criticidade === level && styles.criticalityTextSelected,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Ação</Text>
            <View style={styles.actionTypeContainer}>
              {(['temporaria', 'permanente'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.actionTypeButton,
                    formData.acao_tomada === type && styles.actionTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('acao_tomada', type)}
                >
                  <Text
                    style={[
                      styles.actionTypeText,
                      formData.acao_tomada === type && styles.actionTypeTextActive,
                    ]}
                  >
                    {type === 'temporaria' ? 'Temporária' : 'Permanente'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Materiais Necessários</Text>
            <TextInput
              style={styles.input}
              value={formData.materiais_usados}
              onChangeText={(value) => updateFormData('materiais_usados', value)}
              placeholder="Ex: Parafusos, Isoladores, Cabos (separados por vírgula)"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custo Estimado (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.custo_estimado}
              onChangeText={(value) => updateFormData('custo_estimado', value)}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Responsável pela Execução</Text>
            <TextInput
              style={styles.input}
              value={formData.responsavel}
              onChangeText={(value) => updateFormData('responsavel', value)}
              placeholder="Nome do responsável ou equipe"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações Adicionais</Text>
            <TextInput
              style={styles.textArea}
              value={formData.observacoes}
              onChangeText={(value) => updateFormData('observacoes', value)}
              placeholder="Informações adicionais sobre a ação corretiva..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Informações Importantes:</Text>
          <Text style={styles.infoText}>
            • Ações de criticidade ALTA geram automaticamente uma Ordem de Serviço (OS)
          </Text>
          <Text style={styles.infoText}>
            • Documente evidências fotográficas antes e depois da correção
          </Text>
          <Text style={styles.infoText}>
            • Mantenha registros detalhados para auditoria e conformidade
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    gap: 12,
  },
  alertText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    textAlignVertical: 'top',
  },
  criticalityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  criticalityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  criticalityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  criticalityTextSelected: {
    color: '#ffffff',
  },
  actionTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  actionTypeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  actionTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  actionTypeTextActive: {
    color: '#ffffff',
  },
  infoContainer: {
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
    lineHeight: 18,
  },
});
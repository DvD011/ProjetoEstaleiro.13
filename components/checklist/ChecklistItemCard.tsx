import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ChecklistItem, ChecklistExecution, validateMeasurement } from '@/types/checklist';
import { PhotoGrid } from '@/components/forms/PhotoGrid';
import { CameraViewComponent } from '@/components/camera/CameraView';
import { CircleCheck as CheckCircle, Circle, Camera, TriangleAlert as AlertTriangle, Ruler, Eye, Settings, Shield } from 'lucide-react-native';

interface ChecklistItemCardProps {
  item: ChecklistItem;
  execution?: ChecklistExecution;
  onExecute: (
    itemId: string,
    observation: string,
    measuredValue?: number,
    photoUris?: string[]
  ) => Promise<boolean>;
  onCreateCorrectiveAction?: (itemId: string, description: string) => void;
  disabled?: boolean;
}

export const ChecklistItemCard: React.FC<ChecklistItemCardProps> = ({
  item,
  execution,
  onExecute,
  onCreateCorrectiveAction,
  disabled = false,
}) => {
  const [observation, setObservation] = useState(execution?.observation || '');
  const [measuredValue, setMeasuredValue] = useState(
    execution?.measured_value?.toString() || ''
  );
  const [photoUris, setPhotoUris] = useState<string[]>(execution?.photo_uris || []);
  const [showCamera, setShowCamera] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const isCompleted = execution?.status === 'completed';
  const isFailed = execution?.status === 'failed';
  const hasMeasurement = item.valor_esperado && item.unidade;
  const isRequired = item.foto_required || item.criticidade === 'alta';

  const getCategoryIcon = () => {
    switch (item.categoria) {
      case 'visual': return <Eye size={16} color="#6b7280" />;
      case 'medicao': return <Ruler size={16} color="#2563eb" />;
      case 'operacional': return <Settings size={16} color="#059669" />;
      case 'seguranca': return <Shield size={16} color="#ef4444" />;
      default: return <Circle size={16} color="#6b7280" />;
    }
  };

  const getCriticalityColor = () => {
    switch (item.criticidade) {
      case 'alta': return '#ef4444';
      case 'media': return '#f59e0b';
      case 'baixa': return '#10b981';
      default: return '#6b7280';
    }
  };

  const validateCurrentMeasurement = () => {
    if (!hasMeasurement || !measuredValue) return null;
    
    const numValue = parseFloat(measuredValue);
    if (isNaN(numValue)) return null;
    
    return validateMeasurement(item, numValue);
  };

  const handleExecute = async () => {
    if (isRequired && !observation.trim()) {
      Alert.alert('Erro', 'Observação é obrigatória para este item');
      return;
    }

    if (item.foto_required && photoUris.length === 0) {
      Alert.alert('Erro', 'Foto é obrigatória para este item');
      return;
    }

    setIsExecuting(true);
    try {
      const numMeasuredValue = measuredValue ? parseFloat(measuredValue) : undefined;
      const success = await onExecute(item.id, observation, numMeasuredValue, photoUris);
      
      if (success) {
        Alert.alert('Sucesso', 'Item executado com sucesso!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível executar o item');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCreateCorrectiveAction = () => {
    if (!onCreateCorrectiveAction) return;
    
    Alert.alert(
      'Criar Ação Corretiva',
      'Deseja criar uma ação corretiva para este problema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Criar', 
          onPress: () => onCreateCorrectiveAction(item.id, observation || 'Problema detectado durante inspeção')
        },
      ]
    );
  };

  const handlePhotoTaken = (photoUri: string) => {
    setPhotoUris(prev => [...prev, photoUri]);
    setShowCamera(false);
  };

  const handleRemovePhoto = (photoUri: string) => {
    setPhotoUris(prev => prev.filter(uri => uri !== photoUri));
  };

  const validationResult = validateCurrentMeasurement();

  return (
    <View style={[
      styles.container,
      isCompleted && styles.containerCompleted,
      isFailed && styles.containerFailed
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.statusIndicator}>
            {isCompleted ? (
              <CheckCircle size={20} color="#10b981" />
            ) : isFailed ? (
              <AlertTriangle size={20} color="#ef4444" />
            ) : (
              <Circle size={20} color="#9ca3af" />
            )}
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.acao_curta}</Text>
            <View style={styles.itemMeta}>
              {getCategoryIcon()}
              <Text style={styles.itemCategory}>
                {item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1)}
              </Text>
              <View style={[styles.criticalityBadge, { backgroundColor: getCriticalityColor() }]}>
                <Text style={styles.criticalityText}>
                  {item.criticidade.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.testMethod}>
          <Text style={styles.label}>Como testar: </Text>{item.como_testar}
        </Text>

        {hasMeasurement && (
          <View style={styles.measurementSection}>
            <Text style={styles.label}>Medição:</Text>
            <View style={styles.measurementRow}>
              <TextInput
                style={[
                  styles.measurementInput,
                  validationResult && !validationResult.isValid && styles.measurementInputError
                ]}
                value={measuredValue}
                onChangeText={setMeasuredValue}
                placeholder="0"
                keyboardType="numeric"
                editable={!disabled && !isCompleted}
              />
              <Text style={styles.unit}>{item.unidade}</Text>
              <Text style={styles.expectedValue}>
                (esperado: {item.valor_esperado} ±{item.tolerance_percent}%)
              </Text>
            </View>
            
            {item.metodo_medicao && (
              <Text style={styles.methodText}>
                📏 {item.metodo_medicao}
              </Text>
            )}

            {validationResult && (
              <View style={[
                styles.validationResult,
                validationResult.isValid ? styles.validationSuccess : styles.validationError
              ]}>
                <Text style={[
                  styles.validationText,
                  validationResult.isValid ? styles.validationTextSuccess : styles.validationTextError
                ]}>
                  {validationResult.message}
                  {!validationResult.isValid && ` (desvio: ${validationResult.deviation.toFixed(1)}%)`}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.observationSection}>
          <Text style={styles.label}>
            Observação{isRequired && <Text style={styles.required}> *</Text>}:
          </Text>
          <TextInput
            style={styles.observationInput}
            value={observation}
            onChangeText={setObservation}
            placeholder={item.campo_observacao}
            multiline
            numberOfLines={3}
            editable={!disabled && !isCompleted}
          />
        </View>

        {item.foto_required && (
          <View style={styles.photoSection}>
            <Text style={styles.label}>
              Evidência Fotográfica <Text style={styles.required}>*</Text>:
            </Text>
            
            <View style={styles.photoGrid}>
              {photoUris.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoThumbnail}
                  onPress={() => {/* Abrir preview */}}
                >
                  <Text style={styles.photoIndex}>{index + 1}</Text>
                </TouchableOpacity>
              ))}
              
              {!disabled && !isCompleted && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => setShowCamera(true)}
                >
                  <Camera size={20} color="#6b7280" />
                  <Text style={styles.addPhotoText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      {!disabled && !isCompleted && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.executeButton, isExecuting && styles.executeButtonDisabled]}
            onPress={handleExecute}
            disabled={isExecuting}
          >
            <Text style={styles.executeButtonText}>
              {isExecuting ? 'Executando...' : 'Executar'}
            </Text>
          </TouchableOpacity>

          {isFailed && onCreateCorrectiveAction && (
            <TouchableOpacity
              style={styles.correctiveButton}
              onPress={handleCreateCorrectiveAction}
            >
              <Text style={styles.correctiveButtonText}>Ação Corretiva</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Execution Info */}
      {execution && (
        <View style={styles.executionInfo}>
          <Text style={styles.executionText}>
            Executado em {new Date(execution.executed_at!).toLocaleString('pt-BR')}
            {execution.executed_by && ` por ${execution.executed_by}`}
          </Text>
        </View>
      )}

      {/* Camera Modal */}
      <CameraViewComponent
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        mode="photo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  containerCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  containerFailed: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  criticalityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  criticalityText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  testMethod: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  required: {
    color: '#ef4444',
  },
  measurementSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  measurementInput: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: 80,
  },
  measurementInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  unit: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  expectedValue: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  methodText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 8,
    fontStyle: 'italic',
  },
  validationResult: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  validationSuccess: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  validationError: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  validationTextSuccess: {
    color: '#166534',
  },
  validationTextError: {
    color: '#dc2626',
  },
  observationSection: {
    marginBottom: 16,
  },
  observationInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoSection: {
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  addPhotoButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  executeButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  executeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  executeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  correctiveButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  correctiveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  executionInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  executionText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
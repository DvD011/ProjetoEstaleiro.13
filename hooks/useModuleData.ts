import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDatabase } from '@/providers/DatabaseProvider';
import { MODULE_CONFIGURATIONS, ModuleConfig } from '@/types/inspection';
import * as Location from 'expo-location';

export interface ModuleDataEntry {
  fieldName: string;
  fieldValue: string;
  fieldType: string;
  isRequired: boolean;
}

export const useModuleData = (inspectionId: string, moduleId: string) => {
  const [moduleData, setModuleData] = useState<Record<string, string>>({});
  const [otherFieldsData, setOtherFieldsData] = useState<Record<string, string>>({});
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { db } = useDatabase();

  const moduleConfig = MODULE_CONFIGURATIONS[moduleId];

  useEffect(() => {
    if (db && inspectionId && moduleId) {
      loadModuleData();
      loadPhotos();
    }
  }, [db, inspectionId, moduleId]);

  const loadModuleData = async () => {
    if (!db || !inspectionId || !moduleId) return;

    setLoading(true);
    try {
      const result = await db.getAllAsync(
        'SELECT * FROM module_data WHERE inspection_id = ? AND module_type = ?',
        [inspectionId, moduleId]
      );

      const data: Record<string, string> = {};
      const measurementData: Record<string, string> = {};
      const otherData: Record<string, string> = {};

      result.forEach((row: any) => {
        if (row.field_name.startsWith('measurement_')) {
          measurementData[row.field_name.replace('measurement_', '')] = row.field_value;
        } else if (row.field_name.endsWith('_other')) {
          const baseFieldName = row.field_name.replace('_other', '');
          otherData[baseFieldName] = row.field_value;
        } else {
          data[row.field_name] = row.field_value;
        }
      });

      setModuleData(data);
      setMeasurements(measurementData);
      setOtherFieldsData(otherData);
      setHasChanges(false); // Dados carregados não são mudanças
    } catch (error) {
      console.error('Erro ao carregar dados do módulo:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!db || !inspectionId || !moduleId) return;

    try {
      const result = await db.getAllAsync(
        'SELECT * FROM media_files WHERE inspection_id = ? AND module_type = ? AND file_type LIKE "image/%" ORDER BY created_at ASC',
        [inspectionId, moduleId]
      );

      const photoData: Record<string, string[]> = {};
      
      result.forEach((row: any) => {
        const photoType = extractPhotoType(row.file_name);
        if (!photoData[photoType]) {
          photoData[photoType] = [];
        }
        photoData[photoType].push(row.file_path);
      });

      setPhotos(photoData);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
    }
  };

  const extractPhotoType = (fileName: string): string => {
    // Extrair tipo da foto do nome do arquivo
    const parts = fileName.split('_');
    if (parts.length > 1) {
      return parts[0];
    }
    return 'general';
  };

  const saveModuleData = async (): Promise<boolean> => {
    if (!db || !inspectionId || !moduleId) return false;

    setSaving(true);
    try {
      console.log('Iniciando salvamento dos dados do módulo:', moduleId);
      console.log('Dados a serem salvos:', { moduleData, measurements, otherFieldsData });
      
      // Deletar dados existentes do módulo
      await db.runAsync(
        'DELETE FROM module_data WHERE inspection_id = ? AND module_type = ?',
        [inspectionId, moduleId]
      );

      // Inserir dados dos campos
      for (const [fieldName, fieldValue] of Object.entries(moduleData)) {
        if (fieldValue && fieldValue.toString().trim()) {
          const fieldConfig = moduleConfig?.fields.find(f => f.name === fieldName);
          await db.runAsync(
            'INSERT INTO module_data (id, inspection_id, module_type, field_name, field_value, field_type, is_required) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              inspectionId,
              moduleId,
              fieldName,
              fieldValue.toString().trim(),
              fieldConfig?.type || 'text',
              fieldConfig?.required ? 1 : 0
            ]
          );
          console.log(`Campo salvo: ${fieldName} = ${fieldValue}`);
        }
      }

      // Inserir dados dos campos "Outro"
      for (const [fieldName, fieldValue] of Object.entries(otherFieldsData)) {
        if (fieldValue && fieldValue.toString().trim()) {
          await db.runAsync(
            'INSERT INTO module_data (id, inspection_id, module_type, field_name, field_value, field_type, is_required) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              inspectionId,
              moduleId,
              `${fieldName}_other`,
              fieldValue.toString().trim(),
              'text',
              0
            ]
          );
          console.log(`Campo "Outro" salvo: ${fieldName}_other = ${fieldValue}`);
        }
      }
      // Inserir medições
      for (const [measurementName, measurementValue] of Object.entries(measurements)) {
        if (measurementValue && measurementValue.toString().trim()) {
          const measurementConfig = moduleConfig?.measurements?.find(m => m.name === measurementName);
          await db.runAsync(
            'INSERT INTO module_data (id, inspection_id, module_type, field_name, field_value, field_type, is_required) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              inspectionId,
              moduleId,
              `measurement_${measurementName}`,
              measurementValue.toString().trim(),
              'measurement',
              0
            ]
          );
          console.log(`Medição salva: ${measurementName} = ${measurementValue}`);
        }
      }

      // Atualizar status da inspeção
      await updateInspectionProgress();

      console.log('Dados salvos com sucesso no módulo:', moduleId);
      setHasChanges(false); // Marcar como salvo
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      throw error; // Propagar erro para tratamento no componente
    } finally {
      setSaving(false);
    }
  };

  const updateInspectionProgress = async () => {
    if (!db || !inspectionId) return;

    try {
      console.log('Atualizando progresso da inspeção:', inspectionId);
      
      // Calcular progresso baseado nos módulos obrigatórios completados
      const requiredModules = Object.values(MODULE_CONFIGURATIONS).filter(m => m.required);
      let completedModules = 0;

      for (const module of requiredModules) {
        const moduleDataCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM module_data WHERE inspection_id = ? AND module_type = ?',
          [inspectionId, module.id]
        );

        if (moduleDataCount && moduleDataCount.count > 0) {
          completedModules++;
        }
      }

      const progress = Math.round((completedModules / requiredModules.length) * 100);
      const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'draft';

      console.log(`Progresso calculado: ${progress}% (${completedModules}/${requiredModules.length} módulos)`);
      
      await db.runAsync(
        'UPDATE inspections SET status = ?, progress = ?, updated_at = ? WHERE id = ?',
        [status, progress, new Date().toISOString(), inspectionId]
      );
      
      console.log(`Status da inspeção atualizado para: ${status}`);
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
      throw error;
    }
  };

  const updateField = (fieldName: string, value: string) => {
    setModuleData(prev => ({ ...prev, [fieldName]: value }));
    setHasChanges(true); // Marcar que há mudanças não salvas
    
    // Se o campo não for mais "Outro", limpar o campo adicional
    if (value !== 'Outro' && otherFieldsData[fieldName]) {
      setOtherFieldsData(prev => {
        const newData = { ...prev };
        delete newData[fieldName];
        return newData;
      });
    }
  };

  const updateOtherField = (fieldName: string, value: string) => {
    setOtherFieldsData(prev => ({ ...prev, [fieldName]: value }));
    setHasChanges(true); // Marcar que há mudanças não salvas
  };
  const updateMeasurement = (measurementName: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [measurementName]: value }));
    setHasChanges(true); // Marcar que há mudanças não salvas
  };

  const addPhoto = async (photoType: string, photoUri: string): Promise<boolean> => {
    if (!db || !inspectionId || !moduleId) return false;

    try {
      const photoId = generateId();
      const fileName = `${photoType}_${Date.now()}.jpg`;

      // Salvar no banco de dados imediatamente (fotos são persistidas na captura)
      await db.runAsync(
        'INSERT INTO media_files (id, inspection_id, module_type, file_name, file_path, file_type, file_size, is_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          photoId,
          inspectionId,
          moduleId,
          fileName,
          photoUri,
          'image/jpeg',
          0,
          0
        ]
      );

      // Atualizar estado local
      setPhotos(prev => ({
        ...prev,
        [photoType]: [...(prev[photoType] || []), photoUri]
      }));

      return true;
    } catch (error) {
      console.error('Erro ao adicionar foto:', error);
      return false;
    }
  };

  const removePhoto = async (photoType: string, photoUri: string): Promise<boolean> => {
    if (!db) return false;

    try {
      await db.runAsync(
        'DELETE FROM media_files WHERE file_path = ?',
        [photoUri]
      );

      setPhotos(prev => ({
        ...prev,
        [photoType]: (prev[photoType] || []).filter(uri => uri !== photoUri)
      }));

      return true;
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      return false;
    }
  };

  const validateModule = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!moduleConfig) {
      return { isValid: false, errors: ['Configuração do módulo não encontrada'] };
    }

    console.log('Validando módulo:', moduleId);
    console.log('Dados atuais:', { moduleData, otherFieldsData, photos });
    
    // Validar campos obrigatórios
    const requiredFields = moduleConfig.fields.filter(f => f.required);
    for (const field of requiredFields) {
      const fieldValue = moduleData[field.name];
      // Para campos boolean, não validar se estão vazios (podem ser false/ausentes)
      if (field.type === 'boolean') {
        // Campos boolean são sempre válidos (podem estar ausentes)
        console.log(`Campo boolean ${field.name} - valor: ${fieldValue} (sempre válido)`);
        continue;
      }
      
      // Para campos de tempo, validar formato se preenchido
      if ((field.type === 'time' || field.name.includes('time') || field.name.includes('horario') || field.name.includes('travel')) && fieldValue && fieldValue.trim() !== '') {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(fieldValue)) {
          errors.push(`${field.label} (formato inválido - use HH:MM)`);
          console.log(`Campo de tempo ${field.name} com formato inválido: ${fieldValue}`);
          continue;
        }
      }
      
      if (!fieldValue || fieldValue.toString().trim() === '') {
        errors.push(`${field.label}`);
        console.log(`Campo obrigatório não preenchido: ${field.name}`);
      } else if (fieldValue === 'Outro' && field.options?.includes('Outro')) {
        // Se "Outro" foi selecionado, verificar se o campo adicional foi preenchido
        const otherValue = otherFieldsData[field.name];
        if (!otherValue || otherValue.toString().trim() === '') {
          errors.push(`${field.label} (especificação)`);
          console.log(`Campo "Outro" sem especificação: ${field.name}`);
        }
      } else if (field.type === 'number' && field.validation) {
        // Validar faixa de valores para campos numéricos
        const numValue = parseFloat(fieldValue);
        if (!isNaN(numValue)) {
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            errors.push(`${field.label} (valor mínimo: ${field.validation.min}${field.unit ? ' ' + field.unit : ''})`);
            console.log(`Campo ${field.name} abaixo do mínimo: ${numValue} < ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            errors.push(`${field.label} (valor máximo: ${field.validation.max}${field.unit ? ' ' + field.unit : ''})`);
            console.log(`Campo ${field.name} acima do máximo: ${numValue} > ${field.validation.max}`);
          }
        } else if (fieldValue.trim() !== '') {
          errors.push(`${field.label} (deve ser um número válido)`);
          console.log(`Campo ${field.name} não é um número válido: ${fieldValue}`);
        }
      }
    }

    // Validar fotos obrigatórias
    const requiredPhotos = moduleConfig.photos.filter(p => p.required);
    for (const photo of requiredPhotos) {
      if (!photos[photo.name]?.length) {
        errors.push(`${photo.label}`);
        console.log(`Foto obrigatória não capturada: ${photo.name}`);
      }
    }

    console.log('Resultado da validação:', { isValid: errors.length === 0, errors });
    return { isValid: errors.length === 0, errors };
  };

  const getFieldErrors = (fieldName: string): string[] => {
    const validation = validateModule();
    const fieldConfig = moduleConfig?.fields.find(f => f.name === fieldName);
    
    if (!fieldConfig) return [];
    
    const fieldErrors: string[] = [];
    
    // Verificar se o campo está na lista de erros
    if (validation.errors.includes(fieldConfig.label)) {
      fieldErrors.push('Campo obrigatório');
    }
    
    if (validation.errors.includes(`${fieldConfig.label} (especificação)`)) {
      fieldErrors.push('Especificação obrigatória');
    }
    
    // Verificar erros de validação específicos
    const validationErrors = validation.errors.filter(error => 
      error.startsWith(`${fieldConfig.label} (`) && 
      !error.includes('especificação')
    );
    
    fieldErrors.push(...validationErrors.map(error => 
      error.replace(`${fieldConfig.label} (`, '').replace(')', '')
    ));
    
    return fieldErrors;
  };

  const getPhotoErrors = (photoName: string): string[] => {
    const validation = validateModule();
    const photoConfig = moduleConfig?.photos.find(p => p.name === photoName);
    
    if (!photoConfig) return [];
    
    const photoErrors: string[] = [];
    
    if (validation.errors.includes(photoConfig.label)) {
      photoErrors.push('Foto obrigatória');
    }
    
    return photoErrors;
  };

  const getMeasurementErrors = (measurementName: string): string[] => {
    const measurementConfig = moduleConfig?.measurements?.find(m => m.name === measurementName);
    const measurementValue = measurements[measurementName] || '';
    
    if (!measurementConfig || !measurementValue.trim()) return [];
    
    const measurementErrors: string[] = [];
    const numValue = parseFloat(measurementValue);
    
    if (isNaN(numValue)) {
      measurementErrors.push('Deve ser um número válido');
    } else if (measurementConfig.range) {
      if (numValue < measurementConfig.range.min) {
        measurementErrors.push(`Valor mínimo: ${measurementConfig.range.min}`);
      }
      if (numValue > measurementConfig.range.max) {
        measurementErrors.push(`Valor máximo: ${measurementConfig.range.max}`);
      }
    }
    
    return measurementErrors;
  };
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const updateInspectionGpsStatus = async () => {
    if (!db || !inspectionId) return;

    try {
      // Contar total de fotos da inspeção
      const totalPhotos = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM media_files WHERE inspection_id = ? AND file_type LIKE "image/%"',
        [inspectionId]
      );

      // Contar fotos com GPS
      const photosWithGps = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM media_files WHERE inspection_id = ? AND file_type LIKE "image/%" AND gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL',
        [inspectionId]
      );

      const totalCount = totalPhotos?.count || 0;
      const gpsCount = photosWithGps?.count || 0;
      
      // Se mais de 50% das fotos não têm GPS, marcar para localização manual
      const needsManualLocation = totalCount > 0 && (gpsCount / totalCount) < 0.5 ? 1 : 0;
      
      await db.runAsync(
        'UPDATE inspections SET needs_manual_location = ? WHERE id = ?',
        [needsManualLocation, inspectionId]
      );
      
      console.log(`GPS Status atualizado: ${gpsCount}/${totalCount} fotos com GPS. Needs manual: ${needsManualLocation}`);
    } catch (error) {
      console.error('Erro ao atualizar status GPS:', error);
    }
  };

  const requestManualLocation = async (photoId: string): Promise<boolean> => {
    if (!db) return false;

    try {
      // Solicitar localização atual do dispositivo
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização necessária');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Atualizar foto com GPS manual
      await db.runAsync(
        'UPDATE media_files SET gps_latitude = ?, gps_longitude = ?, gps_accuracy = ? WHERE id = ?',
        [
          location.coords.latitude,
          location.coords.longitude,
          location.coords.accuracy || null,
          photoId
        ]
      );

      // Atualizar status GPS da inspeção
      await updateInspectionGpsStatus();

      Alert.alert('Sucesso', 'Localização adicionada à foto com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao obter localização manual:', error);
      Alert.alert('Erro', 'Não foi possível obter a localização');
      return false;
    }
  };
  return {
    moduleConfig,
    moduleData,
    otherFieldsData,
    measurements,
    photos,
    loading,
    saving,
    hasChanges,
    updateField,
    updateOtherField,
    updateMeasurement,
    addPhoto,
    removePhoto,
    saveModuleData,
    validateModule,
    refreshData: loadModuleData,
    getFieldErrors,
    getPhotoErrors,
    getMeasurementErrors,
    updateInspectionGpsStatus,
    requestManualLocation,
    // Função para verificar se há dados não salvos
    hasUnsavedChanges: () => hasChanges,
  };
};
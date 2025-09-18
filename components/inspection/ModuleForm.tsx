import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useModuleData } from '@/hooks/useModuleData';
import { useConditionalFields } from '@/hooks/useConditionalFields';
import { FormField } from '@/components/forms/FormField';
import { PhotoGrid } from '@/components/forms/PhotoGrid';
import { MeasurementField } from '@/components/forms/MeasurementField';
import { ValidationSummary } from '@/components/forms/ValidationSummary';
import { CameraViewComponent } from '@/components/camera/CameraView';
import { MediaPreview } from '@/components/camera/MediaPreview';
import { useAdvancedCamera } from '@/hooks/useAdvancedCamera';
import { ArrowLeft, Save, Camera, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';

interface ModuleFormProps {
  inspectionId: string;
  moduleId: string;
  onSave?: () => void;
  onBack?: () => void;
}

export const ModuleForm: React.FC<ModuleFormProps> = ({
  inspectionId,
  moduleId,
  onSave,
  onBack,
}) => {
  const {
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
    getFieldErrors,
    getPhotoErrors,
    getMeasurementErrors,
    requestManualLocation,
  } = useModuleData(inspectionId, moduleId);

  const {
    visibleFields,
    visiblePhotos,
    requiredFields,
    cabinTypeConfig,
  } = useConditionalFields(
    moduleId,
    moduleConfig?.fields || [],
    moduleConfig?.photos || [],
    moduleData
  );

  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState('');
  const [photoMetadata, setPhotoMetadata] = useState<Record<string, any>>({});

  const camera = useAdvancedCamera();

  useEffect(() => {
    loadPhotoMetadata();
  }, [photos]);

  const loadPhotoMetadata = async () => {
    // Carregar metadados das fotos (GPS, EXIF) do banco de dados
    const metadata: Record<string, any> = {};
    
    // Simular carregamento de metadados
    Object.entries(photos).forEach(([photoType, photoUris]) => {
      photoUris.forEach(uri => {
        // Em uma implementação real, você buscaria do banco de dados
        metadata[uri] = {
          gps: Math.random() > 0.5 ? {
            latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
            longitude: -46.6333 + (Math.random() - 0.5) * 0.1,
            accuracy: Math.random() * 10 + 1,
          } : null,
          orientation: 'landscape-right',
        };
      });
    });
    
    setPhotoMetadata(metadata);
  };

  const handleTakePhoto = (photoType: string) => {
    setCurrentPhotoType(photoType);
    setShowCamera(true);
  };

  const handlePhotoTaken = async (photoUri: string) => {
    const success = await addPhoto(currentPhotoType, photoUri);
    if (success) {
      setShowCamera(false);
      
      // Verificar se a foto tem GPS
      const hasGps = photoMetadata[photoUri]?.gps;
      if (!hasGps) {
        Alert.alert(
          'GPS não encontrado',
          'Esta foto não possui dados de localização. Deseja adicionar a localização atual?',
          [
            { text: 'Não', style: 'cancel' },
            { text: 'Sim', onPress: () => requestManualLocation(photoUri) },
          ]
        );
      }
    }
  };

  const handleSave = async () => {
    try {
      const validation = validateModule();
      if (!validation.isValid) {
        Alert.alert(
          'Campos Obrigatórios',
          `Por favor, preencha os seguintes campos:\n\n${validation.errors.join('\n')}`
        );
        return;
      }

      await saveModuleData();
      Alert.alert('Sucesso', 'Dados salvos com sucesso!');
      onSave?.();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar os dados');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando módulo...</Text>
      </View>
    );
  }

  if (!moduleConfig) {
    return (
      <View style={styles.errorContainer}>
        <Text>Configuração do módulo não encontrada</Text>
      </View>
    );
  }

  const validation = validateModule();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{moduleConfig.title}</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Module Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>{moduleConfig.description}</Text>
          
          {cabinTypeConfig && (
            <View style={styles.cabinTypeInfo}>
              <Text style={styles.cabinTypeTitle}>
                Tipo Selecionado: {cabinTypeConfig.label}
              </Text>
              <Text style={styles.cabinTypeDescription}>
                {cabinTypeConfig.description}
              </Text>
            </View>
          )}
        </View>

        {/* Validation Summary */}
        <ValidationSummary
          errors={validation.errors.map(error => ({ field: '', message: error }))}
          showSuccessMessage={validation.isValid}
        />

        {/* Form Fields */}
        <View style={styles.fieldsSection}>
          {visibleFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={moduleData[field.name] || ''}
              onValueChange={(value) => updateField(field.name, value)}
              otherValue={otherFieldsData[field.name] || ''}
              onOtherValueChange={(value) => updateOtherField(field.name, value)}
              hasError={getFieldErrors(field.name).length > 0}
            />
          ))}
        </View>

        {/* Measurements */}
        {moduleConfig.measurements && moduleConfig.measurements.length > 0 && (
          <View style={styles.measurementsSection}>
            <Text style={styles.sectionTitle}>Medições</Text>
            {moduleConfig.measurements.map((measurement) => (
              <MeasurementField
                key={measurement.name}
                measurement={measurement}
                value={measurements[measurement.name] || ''}
                onValueChange={(value) => updateMeasurement(measurement.name, value)}
                hasError={getMeasurementErrors(measurement.name).length > 0}
                errorMessage={getMeasurementErrors(measurement.name)[0]}
              />
            ))}
          </View>
        )}

        {/* Photos */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Evidências Fotográficas</Text>
          
          {visiblePhotos.map((photoConfig) => (
            <PhotoGrid
              key={photoConfig.name}
              photoConfig={photoConfig}
              photos={photos[photoConfig.name] || []}
              onTakePhoto={() => handleTakePhoto(photoConfig.name)}
              onPreviewPhoto={(uri) => {
                setPreviewUri(uri);
                setShowPreview(true);
              }}
              onDeletePhoto={(uri) => removePhoto(photoConfig.name, uri)}
              onRequestManualLocation={requestManualLocation}
              photoMetadata={photoMetadata}
              hasError={getPhotoErrors(photoConfig.name).length > 0}
              errorMessage={getPhotoErrors(photoConfig.name)[0]}
            />
          ))}
        </View>

        {/* Instructions */}
        {moduleConfig.instructions && (
          <View style={styles.instructionsSection}>
            <Text style={styles.sectionTitle}>Instruções</Text>
            {moduleConfig.instructions.map((instruction, index) => (
              <Text key={index} style={styles.instruction}>
                • {instruction}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Camera Modal */}
      <CameraViewComponent
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        mode="photo"
      />

      {/* Media Preview */}
      <MediaPreview
        visible={showPreview}
        uri={previewUri}
        type="photo"
        onClose={() => setShowPreview(false)}
        title="Evidência Fotográfica"
      />
    </View>
  );
};

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  descriptionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  cabinTypeInfo: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  cabinTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  cabinTypeDescription: {
    fontSize: 12,
    color: '#3730a3',
    lineHeight: 16,
  },
  fieldsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  measurementsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photosSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});
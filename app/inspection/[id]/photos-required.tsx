import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAdvancedCamera } from '@/hooks/useAdvancedCamera';
import { CameraViewComponent } from '@/components/camera/CameraView';
import { MediaPreview } from '@/components/camera/MediaPreview';
import { PHOTO_SPECIFICATION } from '@/utils/photoSpecification';
import { ArrowLeft, Camera, CircleCheck as CheckCircle, Circle, MapPin, ClipboardCheck } from 'lucide-react-native';

interface RequiredPhoto {
  id: string;
  name: string;
  label: string;
  description: string;
  captured: boolean;
  uri?: string;
  hasGps?: boolean;
}

export default function RequiredPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photos, setPhotos] = useState<RequiredPhoto[]>(
    PHOTO_SPECIFICATION.photos.map(photoSpec => ({
      id: photoSpec.id,
      name: photoSpec.name,
      label: photoSpec.label,
      description: photoSpec.description,
      captured: false,
    }))
  );

  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState('');
  const [loading, setLoading] = useState(false);

  const camera = useAdvancedCamera();

  useEffect(() => {
    loadExistingPhotos();
  }, []);

  const loadExistingPhotos = async () => {
    // Load existing photos from database if any
    // This would integrate with the existing photo system
  };

  const handleTakePhoto = (photoIndex: number) => {
    setCurrentPhotoIndex(photoIndex);
    setShowCamera(true);
  };

  const handlePhotoTaken = async (photoUri: string) => {
    const photoToUpdate = photos[currentPhotoIndex];
    
    // Save photo to inspection
    const success = await camera.saveMediaToInspection(
      {
        id: `photo_${Date.now()}`,
        uri: photoUri,
        type: 'photo',
        timestamp: Date.now(),
      },
      id!,
      'required_photos',
      photoToUpdate.description,
      photoToUpdate.name
    );

    if (success) {
      setPhotos(prev => prev.map((photo, index) => 
        index === currentPhotoIndex 
          ? { ...photo, captured: true, uri: photoUri, hasGps: true }
          : photo
      ));
      setShowCamera(false);
      
      // Auto-advance to next photo if available
      const nextPhotoIndex = photos.findIndex((photo, index) => 
        index > currentPhotoIndex && !photo.captured
      );
      
      if (nextPhotoIndex !== -1) {
        Alert.alert(
          'Foto Capturada!',
          `${photoToUpdate.label} foi salva. Deseja capturar a próxima foto?`,
          [
            { text: 'Depois', style: 'cancel' },
            { 
              text: 'Próxima Foto', 
              onPress: () => handleTakePhoto(nextPhotoIndex)
            },
          ]
        );
      } else {
        Alert.alert('Sucesso', 'Todas as fotos obrigatórias foram capturadas!');
      }
    }
  };

  const handleRetakePhoto = (photoIndex: number) => {
    Alert.alert(
      'Refazer Foto',
      `Deseja refazer a ${photos[photoIndex].label}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Refazer', onPress: () => handleTakePhoto(photoIndex) },
      ]
    );
  };

  const handleContinueToChecklist = () => {
    const capturedCount = photos.filter(p => p.captured).length;
    
    if (capturedCount < 4) {
      Alert.alert(
        'Fotos Obrigatórias',
        `${4 - capturedCount} foto(s) ainda precisam ser capturadas. Deseja continuar mesmo assim?`,
        [
          { text: 'Voltar', style: 'cancel' },
          { 
            text: 'Continuar', 
            onPress: () => router.push(`/inspection/${id}/checklist`)
          },
        ]
      );
    } else {
      router.push(`/inspection/${id}/checklist`);
    }
  };

  const capturedCount = photos.filter(p => p.captured).length;
  const progress = Math.round((capturedCount / 4) * 100);

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
        <Text style={styles.title}>Evidências Fotográficas Essenciais</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Progresso: {progress}%</Text>
          <Text style={styles.progressPhotos}>{capturedCount}/4 fotos</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>Capture as fotos obrigatórias</Text>
        <Text style={styles.instructionsText}>
          Estas fotos são cruciais para a documentação da inspeção e geração do relatório técnico.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Photo Grid */}
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoCard}>
              <View style={styles.photoHeader}>
                <Text style={styles.photoLabel}>{photo.label}</Text>
                <View style={styles.photoStatus}>
                  {photo.captured ? (
                    <CheckCircle size={20} color="#10b981" />
                  ) : (
                    <Circle size={20} color="#d1d5db" />
                  )}
                </View>
              </View>
              
              <Text style={styles.photoDescription}>{photo.description}</Text>
              
              <View style={styles.photoContent}>
                {photo.captured && photo.uri ? (
                  <TouchableOpacity
                    style={styles.photoPreview}
                    onPress={() => {
                      setPreviewUri(photo.uri!);
                      setShowPreview(true);
                    }}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoOverlayText}>Toque para visualizar</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.photoPlaceholder}
                    onPress={() => handleTakePhoto(index)}
                  >
                    <Camera size={32} color="#6b7280" />
                    <Text style={styles.photoPlaceholderText}>
                      Tirar {photo.label.split(' - ')[1]}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.photoActions}>
                {photo.captured ? (
                  <>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => handleRetakePhoto(index)}
                    >
                      <Camera size={16} color="#2563eb" />
                      <Text style={styles.retakeButtonText}>Refazer</Text>
                    </TouchableOpacity>
                    
                    {!photo.hasGps && (
                      <View style={styles.gpsWarning}>
                        <MapPin size={12} color="#f59e0b" />
                        <Text style={styles.gpsWarningText}>Sem GPS</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.photoHint}>
                    <Text style={styles.photoHintText}>
                      📸 {photo.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* GPS Status */}
        <View style={styles.gpsStatusCard}>
          <Text style={styles.gpsStatusTitle}>Status de Localização</Text>
          <Text style={styles.gpsStatusText}>
            {photos.filter(p => p.captured && p.hasGps).length} de {capturedCount} fotos com GPS
          </Text>
          {capturedCount > 0 && photos.some(p => p.captured && !p.hasGps) && (
            <Text style={styles.gpsWarning}>
              ⚠️ Algumas fotos não possuem dados de GPS. Isso pode afetar a precisão do relatório.
            </Text>
          )}
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>Próximos Passos</Text>
          <Text style={styles.nextStepsText}>
            Após capturar as fotos obrigatórias, você será direcionado para:
          </Text>
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStepItem}>1. Checklist Preventivo - Itens de verificação técnica</Text>
            <Text style={styles.nextStepItem}>2. Ações Corretivas - Problemas identificados</Text>
            <Text style={styles.nextStepItem}>3. Revisão Final - Conclusão e assinatura</Text>
            <Text style={styles.nextStepItem}>4. Geração de Relatório - PDF profissional</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push(`/inspection/${id}`)}
        >
          <Text style={styles.skipButtonText}>Pular para Módulos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            capturedCount === 0 && styles.continueButtonDisabled
          ]}
          onPress={handleContinueToChecklist}
          disabled={capturedCount === 0}
        >
          <ClipboardCheck size={20} color="#ffffff" />
          <Text style={styles.continueButtonText}>
            {capturedCount === 4 ? 'Continuar para Checklist' : `Continuar (${capturedCount}/4)`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera Modal */}
      <CameraViewComponent
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        mode="photo"
      />

      {/* Photo Preview */}
      <MediaPreview
        visible={showPreview}
        uri={previewUri}
        type="photo"
        onClose={() => setShowPreview(false)}
        title="Evidência Fotográfica"
      />
    </View>
  );
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
  placeholder: {
    width: 40,
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPhotos: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  instructionsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  photoGrid: {
    padding: 20,
    gap: 16,
  },
  photoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  photoStatus: {
    // Status icon container
  },
  photoDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  photoContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    fontWeight: '500',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  retakeButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gpsWarningText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '500',
  },
  photoHint: {
    flex: 1,
  },
  photoHintText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  gpsStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gpsStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  gpsStatusText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  nextStepsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  nextStepsList: {
    gap: 8,
  },
  nextStepItem: {
    fontSize: 13,
    color: '#374151',
    paddingVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
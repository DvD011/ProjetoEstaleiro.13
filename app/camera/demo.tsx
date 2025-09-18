import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { CameraViewComponent } from '@/components/camera/CameraView';
import { CameraButton } from '@/components/camera/CameraButton';
import { MediaPreview } from '@/components/camera/MediaPreview';
import { CameraPermissionGuard } from '@/components/camera/CameraPermissionGuard';
import { useAdvancedCamera } from '@/hooks/useAdvancedCamera';
import { ArrowLeft, Camera, Video, Settings } from 'lucide-react-native';

export default function CameraDemoScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | 'both'>('photo');
  const [capturedMedia, setCapturedMedia] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState('');
  const [previewType, setPreviewType] = useState<'photo' | 'video'>('photo');
  
  const camera = useAdvancedCamera();

  const handlePhotoTaken = (photoUri: string) => {
    setCapturedMedia(prev => [...prev, photoUri]);
    Alert.alert('Sucesso', 'Foto capturada com sucesso!');
  };

  const handleVideoRecorded = (videoUri: string) => {
    setCapturedMedia(prev => [...prev, videoUri]);
    Alert.alert('Sucesso', 'Vídeo gravado com sucesso!');
  };

  const openCamera = (mode: 'photo' | 'video' | 'both') => {
    setCameraMode(mode);
    setShowCamera(true);
  };

  const previewMedia = (uri: string, type: 'photo' | 'video') => {
    setPreviewUri(uri);
    setPreviewType(type);
    setShowPreview(true);
  };

  const deleteMedia = (uri: string) => {
    setCapturedMedia(prev => prev.filter(item => item !== uri));
  };

  return (
    <CameraPermissionGuard>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Demo da Câmera</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Camera Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Controles da Câmera</Text>
            <Text style={styles.sectionDescription}>
              Teste as diferentes funcionalidades da câmera
            </Text>
            
            <View style={styles.buttonGrid}>
              <CameraButton
                onPress={() => openCamera('photo')}
                mode="photo"
                size="large"
                variant="primary"
              />
              
              <CameraButton
                onPress={() => openCamera('video')}
                mode="video"
                size="large"
                variant="secondary"
              />
              
              <CameraButton
                onPress={() => openCamera('both')}
                mode="both"
                size="large"
                variant="outline"
              />
            </View>
          </View>

          {/* Camera Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            
            <View style={styles.settingsGrid}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Câmera:</Text>
                <Text style={styles.settingValue}>
                  {camera.settings.facing === 'back' ? 'Traseira' : 'Frontal'}
                </Text>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={camera.toggleCamera}
                >
                  <Text style={styles.settingButtonText}>Alternar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Flash:</Text>
                <Text style={styles.settingValue}>
                  {camera.settings.flash === 'off' ? 'Desligado' : 
                   camera.settings.flash === 'on' ? 'Ligado' : 'Automático'}
                </Text>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={camera.toggleFlash}
                >
                  <Text style={styles.settingButtonText}>Alternar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Zoom:</Text>
                <Text style={styles.settingValue}>
                  {(camera.settings.zoom * 10 + 1).toFixed(1)}x
                </Text>
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => camera.adjustZoom('out')}
                  >
                    <Text style={styles.zoomButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => camera.adjustZoom('in')}
                  >
                    <Text style={styles.zoomButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Captured Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mídia Capturada</Text>
            <Text style={styles.sectionDescription}>
              {capturedMedia.length} item(s) capturado(s)
            </Text>
            
            {capturedMedia.length > 0 ? (
              <View style={styles.mediaGrid}>
                {capturedMedia.map((uri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.mediaItem}
                    onPress={() => previewMedia(uri, uri.includes('.mp4') ? 'video' : 'photo')}
                  >
                    <View style={styles.mediaPlaceholder}>
                      {uri.includes('.mp4') ? (
                        <Video size={24} color="#6b7280" />
                      ) : (
                        <Camera size={24} color="#6b7280" />
                      )}
                    </View>
                    <Text style={styles.mediaLabel}>
                      {uri.includes('.mp4') ? 'Vídeo' : 'Foto'} {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Camera size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>
                  Nenhuma mídia capturada ainda
                </Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Câmera Pronta:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: camera.isReady ? '#10b981' : '#ef4444' }
                ]}>
                  {camera.isReady ? 'Sim' : 'Não'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Gravando:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: camera.isRecording ? '#ef4444' : '#6b7280' }
                ]}>
                  {camera.isRecording ? 'Sim' : 'Não'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Permissões:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: camera.hasPermissions ? '#10b981' : '#ef4444' }
                ]}>
                  {camera.hasPermissions ? 'Concedidas' : 'Negadas'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Camera Modal */}
        <CameraViewComponent
          visible={showCamera}
          onClose={() => setShowCamera(false)}
          onPhotoTaken={handlePhotoTaken}
          onVideoRecorded={cameraMode !== 'photo' ? handleVideoRecorded : undefined}
          mode={cameraMode}
          maxDuration={30}
        />

        {/* Media Preview */}
        <MediaPreview
          visible={showPreview}
          uri={previewUri}
          type={previewType}
          onClose={() => setShowPreview(false)}
          onDelete={() => deleteMedia(previewUri)}
          title="Mídia Capturada"
        />
      </View>
    </CameraPermissionGuard>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  buttonGrid: {
    gap: 12,
  },
  settingsGrid: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
  },
  settingButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 8,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: '30%',
    alignItems: 'center',
  },
  mediaPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
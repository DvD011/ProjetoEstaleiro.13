import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { 
  X, 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Video, 
  Square,
  ZoomIn,
  ZoomOut,
  Palette,
  Settings
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CameraViewProps {
  visible: boolean;
  onClose: () => void;
  onPhotoTaken: (photoUri: string) => void;
  onVideoRecorded?: (videoUri: string) => void;
  mode?: 'photo' | 'video' | 'both';
  maxDuration?: number; // em segundos para vídeo
}

type FilterType = 'none' | 'sepia' | 'noir' | 'chrome' | 'fade' | 'instant';

export const CameraViewComponent: React.FC<CameraViewProps> = ({
  visible,
  onClose,
  onPhotoTaken,
  onVideoRecorded,
  mode = 'both',
  maxDuration = 30,
}) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [filter, setFilter] = useState<FilterType>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'photo' | 'video'>('photo');
  
  const cameraRef = useRef<any>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      checkPermissions();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      // Verificar permissão de câmera
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          Alert.alert(
            'Permissão Necessária',
            'O aplicativo precisa de acesso à câmera para capturar fotos e vídeos.',
            [
              { text: 'Cancelar', onPress: onClose },
              { text: 'Permitir', onPress: () => requestCameraPermission() }
            ]
          );
          return;
        }
      }

      // Verificar permissão de mídia
      if (!mediaPermission?.granted) {
        const mediaResult = await requestMediaPermission();
        if (!mediaResult.granted) {
          Alert.alert(
            'Permissão Necessária',
            'O aplicativo precisa de acesso à galeria para salvar fotos e vídeos.',
            [
              { text: 'Cancelar', onPress: onClose },
              { text: 'Permitir', onPress: () => requestMediaPermission() }
            ]
          );
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      Alert.alert('Erro', 'Não foi possível verificar as permissões necessárias.');
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setZoom(current => {
      const step = 0.1;
      if (direction === 'in') {
        return Math.min(1, current + step);
      } else {
        return Math.max(0, current - step);
      }
    });
  };

  const takePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Erro', 'Câmera não está disponível');
      return;
    }

    setIsLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
        exif: true,
      });

      if (photo?.uri) {
        // Salvar na galeria se possível
        if (Platform.OS !== 'web' && mediaPermission?.granted) {
          try {
            await MediaLibrary.saveToLibraryAsync(photo.uri);
          } catch (error) {
            console.warn('Não foi possível salvar na galeria:', error);
          }
        }

        onPhotoTaken(photo.uri);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !onVideoRecorded) {
      Alert.alert('Erro', 'Gravação de vídeo não está disponível');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar contador de tempo
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: maxDuration * 1000, // converter para ms
        quality: '720p',
      });

      if (video?.uri) {
        // Salvar na galeria se possível
        if (Platform.OS !== 'web' && mediaPermission?.granted) {
          try {
            await MediaLibrary.saveToLibraryAsync(video.uri);
          } catch (error) {
            console.warn('Não foi possível salvar na galeria:', error);
          }
        }

        onVideoRecorded(video.uri);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao gravar vídeo:', error);
      Alert.alert('Erro', 'Não foi possível gravar o vídeo');
      setIsRecording(false);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFlashIcon = () => {
    switch (flash) {
      case 'on': return <Zap size={24} color="#ffffff" />;
      case 'auto': return <Zap size={24} color="#fbbf24" />;
      default: return <ZapOff size={24} color="#ffffff" />;
    }
  };

  const FilterButton = ({ filterType, label }: { filterType: FilterType; label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  // Verificar se as permissões foram concedidas
  if (!cameraPermission?.granted || !mediaPermission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#6b7280" />
          <Text style={styles.permissionTitle}>Permissões Necessárias</Text>
          <Text style={styles.permissionText}>
            Para usar a câmera, precisamos de acesso à câmera e à galeria de fotos.
          </Text>
          
          <View style={styles.permissionButtons}>
            <TouchableOpacity style={styles.permissionButton} onPress={checkPermissions}>
              <Text style={styles.permissionButtonText}>Conceder Permissões</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
          zoom={zoom}
          // Aplicar filtro se suportado
          // filter={filter !== 'none' ? filter : undefined}
        >
          {/* Header Controls */}
          <View style={styles.headerControls}>
            <TouchableOpacity style={styles.controlButton} onPress={onClose}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.controlButton} onPress={() => setShowSettings(!showSettings)}>
              <Settings size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Side Controls */}
          <View style={styles.sideControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <RotateCcw size={24} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              {getFlashIcon()}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => adjustZoom('in')}>
              <ZoomIn size={24} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => adjustZoom('out')}>
              <ZoomOut size={24} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => setShowSettings(!showSettings)}>
              <Palette size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Mode Selector */}
            {mode === 'both' && (
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[styles.modeButton, currentMode === 'photo' && styles.modeButtonActive]}
                  onPress={() => setCurrentMode('photo')}
                >
                  <Text style={[styles.modeText, currentMode === 'photo' && styles.modeTextActive]}>
                    FOTO
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modeButton, currentMode === 'video' && styles.modeButtonActive]}
                  onPress={() => setCurrentMode('video')}
                >
                  <Text style={[styles.modeText, currentMode === 'video' && styles.modeTextActive]}>
                    VÍDEO
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Capture Controls */}
            <View style={styles.captureControls}>
              {(currentMode === 'photo' || mode === 'photo') && (
                <TouchableOpacity
                  style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
                  onPress={takePhoto}
                  disabled={isLoading || isRecording}
                >
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#ffffff" />
                  ) : (
                    <Camera size={32} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}

              {(currentMode === 'video' || mode === 'video') && onVideoRecorded && (
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    styles.videoButton,
                    isRecording && styles.recordingButton
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                >
                  {isRecording ? (
                    <Square size={24} color="#ffffff" />
                  ) : (
                    <Video size={32} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Zoom Indicator */}
            {zoom > 0 && (
              <View style={styles.zoomIndicator}>
                <Text style={styles.zoomText}>{(zoom * 10 + 1).toFixed(1)}x</Text>
              </View>
            )}
          </View>
        </CameraView>

        {/* Settings Panel */}
        {showSettings && (
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>Filtros</Text>
            <View style={styles.filtersContainer}>
              <FilterButton filterType="none" label="Normal" />
              <FilterButton filterType="sepia" label="Sépia" />
              <FilterButton filterType="noir" label="P&B" />
              <FilterButton filterType="chrome" label="Chrome" />
              <FilterButton filterType="fade" label="Fade" />
              <FilterButton filterType="instant" label="Instant" />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  headerControls: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  recordingTime: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  sideControls: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -120 }],
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
  },
  modeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#000000',
  },
  captureControls: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  videoButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  recordingButton: {
    backgroundColor: 'rgba(239, 68, 68, 1)',
    transform: [{ scale: 0.9 }],
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: -40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  settingsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#ffffff',
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#000000',
  },
});
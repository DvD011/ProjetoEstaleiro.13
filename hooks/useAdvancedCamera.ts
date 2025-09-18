import { useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions, FlashMode, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useDatabase } from '@/providers/DatabaseProvider';

export interface CameraSettings {
  facing: CameraType;
  flash: FlashMode;
  zoom: number;
  quality: number;
  aspectRatio?: string;
}

export interface MediaFile {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  timestamp: number;
  size?: number;
  duration?: number; // para vídeos
}

export const useAdvancedCamera = () => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<CameraSettings>({
    facing: 'back',
    flash: 'off',
    zoom: 0,
    quality: 0.8,
    aspectRatio: '4:3',
  });
  
  const cameraRef = useRef<any>(null);
  const { db } = useDatabase();

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar permissão de câmera
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert(
            'Permissão Necessária',
            'O aplicativo precisa de acesso à câmera para funcionar corretamente.',
            [
              { text: 'Configurações', onPress: () => {
                // Abrir configurações do app se possível
                if (Platform.OS === 'ios') {
                  // Linking.openURL('app-settings:');
                }
              }},
              { text: 'Cancelar', style: 'cancel' }
            ]
          );
          return false;
        }
      }

      // Verificar permissão de mídia
      if (!mediaPermission?.granted) {
        const result = await requestMediaPermission();
        if (!result.granted) {
          Alert.alert(
            'Permissão Necessária',
            'O aplicativo precisa de acesso à galeria para salvar fotos e vídeos.',
            [
              { text: 'Tentar Novamente', onPress: () => requestMediaPermission() },
              { text: 'Cancelar', style: 'cancel' }
            ]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }, [cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission]);

  const initializeCamera = useCallback(async () => {
    const hasPermissions = await checkPermissions();
    if (hasPermissions) {
      setIsReady(true);
    }
    return hasPermissions;
  }, [checkPermissions]);

  const updateSettings = useCallback((newSettings: Partial<CameraSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleCamera = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      facing: prev.facing === 'back' ? 'front' : 'back'
    }));
  }, []);

  const toggleFlash = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      flash: prev.flash === 'off' ? 'on' : prev.flash === 'on' ? 'auto' : 'off'
    }));
  }, []);

  const adjustZoom = useCallback((direction: 'in' | 'out', step: number = 0.1) => {
    setSettings(prev => ({
      ...prev,
      zoom: direction === 'in' 
        ? Math.min(1, prev.zoom + step)
        : Math.max(0, prev.zoom - step)
    }));
  }, []);

  const capturePhoto = useCallback(async (): Promise<MediaFile | null> => {
    if (!cameraRef.current || !isReady) {
      Alert.alert('Erro', 'Câmera não está pronta');
      return null;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: settings.quality,
        base64: false,
        skipProcessing: false,
        exif: true,
      });

      if (!photo?.uri) {
        throw new Error('Falha ao capturar foto');
      }

      // Obter informações do arquivo
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);
      
      const mediaFile: MediaFile = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: photo.uri,
        type: 'photo',
        timestamp: Date.now(),
        size: fileInfo.size || 0,
      };

      // Salvar na galeria se possível
      if (Platform.OS !== 'web' && mediaPermission?.granted) {
        try {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
        } catch (error) {
          console.warn('Não foi possível salvar na galeria:', error);
        }
      }

      return mediaFile;
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
      return null;
    }
  }, [isReady, settings.quality, mediaPermission]);

  const startVideoRecording = useCallback(async (maxDuration?: number): Promise<boolean> => {
    if (!cameraRef.current || !isReady || isRecording) {
      Alert.alert('Erro', 'Não é possível iniciar a gravação');
      return false;
    }

    try {
      setIsRecording(true);
      
      await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: maxDuration ? maxDuration * 1000 : undefined,
        mute: false,
      });

      return true;
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      setIsRecording(false);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação');
      return false;
    }
  }, [isReady, isRecording]);

  const stopVideoRecording = useCallback(async (): Promise<MediaFile | null> => {
    if (!cameraRef.current || !isRecording) {
      return null;
    }

    try {
      const video = await cameraRef.current.stopRecording();
      setIsRecording(false);

      if (!video?.uri) {
        throw new Error('Falha ao gravar vídeo');
      }

      // Obter informações do arquivo
      const fileInfo = await FileSystem.getInfoAsync(video.uri);
      
      const mediaFile: MediaFile = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: video.uri,
        type: 'video',
        timestamp: Date.now(),
        size: fileInfo.size || 0,
        // duration seria obtida de metadados se disponível
      };

      // Salvar na galeria se possível
      if (Platform.OS !== 'web' && mediaPermission?.granted) {
        try {
          await MediaLibrary.saveToLibraryAsync(video.uri);
        } catch (error) {
          console.warn('Não foi possível salvar na galeria:', error);
        }
      }

      return mediaFile;
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      setIsRecording(false);
      Alert.alert('Erro', 'Não foi possível finalizar a gravação');
      return null;
    }
  }, [isRecording, mediaPermission]);

  const saveMediaToInspection = useCallback(async (
    mediaFile: MediaFile,
    inspectionId: string,
    moduleType: string,
    description?: string,
    photoType?: string,
    clientName?: string,
    inspectionDate?: string
  ): Promise<boolean> => {
    if (!db) {
      console.warn('Database não disponível');
      return false;
    }

    try {
      let finalPath = mediaFile.uri;
      
      // Apenas mover arquivo se não estiver na web
      if (Platform.OS !== 'web') {
        // Criar diretório para a inspeção se não existir
        const inspectionDir = `${FileSystem.documentDirectory}inspections/${inspectionId}/`;
        const dirInfo = await FileSystem.getInfoAsync(inspectionDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(inspectionDir, { intermediates: true });
        }

        // Gerar nome único para o arquivo
        const fileExtension = mediaFile.type === 'photo' ? 'jpg' : 'mp4';
        const fileName = `${mediaFile.id}.${fileExtension}`;
        finalPath = `${inspectionDir}${fileName}`;

        // Mover arquivo para o diretório da inspeção
        await FileSystem.moveAsync({
          from: mediaFile.uri,
          to: finalPath,
        });
      }

      // Gerar nome do arquivo baseado nos parâmetros
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = photoType && clientName && inspectionDate 
        ? `${clientName}_${inspectionDate}_${photoType}_${timestamp}.jpg`
        : `${mediaFile.id}.${mediaFile.type === 'photo' ? 'jpg' : 'mp4'}`;

      // Salvar no banco de dados
      await db.runAsync(
        `INSERT INTO media_files 
         (id, inspection_id, module_type, file_name, file_path, file_type, file_size, is_required, created_at, photo_type_for_file, client_name_for_file, inspection_date_for_file) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mediaFile.id,
          inspectionId,
          moduleType,
          fileName,
          finalPath,
          mediaFile.type === 'photo' ? 'image/jpeg' : 'video/mp4',
          mediaFile.size || 0,
          0,
          new Date().toISOString(),
          photoType || null,
          clientName || null,
          inspectionDate || null,
        ]
      );

      return true;
    } catch (error) {
      console.error('Erro ao salvar mídia na inspeção:', error);
      return false;
    }
  }, [db]);

  const pauseCamera = useCallback(() => {
    setIsReady(false);
  }, []);

  const resumeCamera = useCallback(async () => {
    const hasPermissions = await checkPermissions();
    if (hasPermissions) {
      setIsReady(true);
    }
  }, [checkPermissions]);

  const cleanup = useCallback(async () => {
    if (isRecording) {
      await stopVideoRecording();
    }
    setIsReady(false);
  }, [isRecording, stopVideoRecording]);

  return {
    // Estado
    cameraRef,
    isReady,
    isRecording,
    settings,
    hasPermissions: cameraPermission?.granted && mediaPermission?.granted,
    
    // Métodos de controle
    initializeCamera,
    pauseCamera,
    resumeCamera,
    cleanup,
    
    // Configurações
    updateSettings,
    toggleCamera,
    toggleFlash,
    adjustZoom,
    
    // Captura
    capturePhoto,
    startVideoRecording,
    stopVideoRecording,
    
    // Integração
    saveMediaToInspection,
    
    // Permissões
    checkPermissions,
  };
};

// Função auxiliar para converter coordenadas DMS para DD
function convertDMSToDD(dms: number[], ref: string): number {
  if (!dms || dms.length < 3) return 0;
  
  const degrees = dms[0] || 0;
  const minutes = dms[1] || 0;
  const seconds = dms[2] || 0;
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  
  // Aplicar sinal baseado na referência
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }
  
  return dd;
}

// Função auxiliar para converter código de orientação EXIF para string
function getOrientationString(orientation: number): string {
  switch (orientation) {
    case 1: return 'normal';
    case 2: return 'flip-horizontal';
    case 3: return 'rotate-180';
    case 4: return 'flip-vertical';
    case 5: return 'rotate-90-flip-horizontal';
    case 6: return 'rotate-90';
    case 7: return 'rotate-270-flip-horizontal';
    case 8: return 'rotate-270';
    default: return 'unknown';
  }
}
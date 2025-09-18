import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Camera, Settings, TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface CameraPermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const CameraPermissionGuard: React.FC<CameraPermissionGuardProps> = ({
  children,
  fallback,
}) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isChecking, setIsChecking] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'checking'>('checking');

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    setIsChecking(true);
    
    try {
      // Verificar permissões atuais
      const cameraGranted = cameraPermission?.granted || false;
      const mediaGranted = mediaPermission?.granted || false;
      
      if (cameraGranted && mediaGranted) {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setPermissionStatus('denied');
    } finally {
      setIsChecking(false);
    }
  };

  const requestAllPermissions = async () => {
    try {
      setIsChecking(true);
      
      // Solicitar permissão de câmera
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          showPermissionAlert('câmera');
          return;
        }
      }

      // Solicitar permissão de mídia
      if (!mediaPermission?.granted) {
        const mediaResult = await requestMediaPermission();
        if (!mediaResult.granted) {
          showPermissionAlert('galeria');
          return;
        }
      }

      setPermissionStatus('granted');
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      Alert.alert('Erro', 'Não foi possível solicitar as permissões necessárias');
    } finally {
      setIsChecking(false);
    }
  };

  const showPermissionAlert = (type: string) => {
    Alert.alert(
      'Permissão Necessária',
      `O aplicativo precisa de acesso à ${type} para funcionar corretamente. Você pode conceder essa permissão nas configurações do dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Configurações', onPress: openAppSettings },
      ]
    );
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  if (isChecking || permissionStatus === 'checking') {
    return (
      <View style={styles.container}>
        <Camera size={48} color="#6b7280" />
        <Text style={styles.title}>Verificando Permissões</Text>
        <Text style={styles.subtitle}>Aguarde um momento...</Text>
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.container}>
        <AlertTriangle size={64} color="#f59e0b" />
        <Text style={styles.title}>Permissões Necessárias</Text>
        <Text style={styles.subtitle}>
          Para usar a câmera, precisamos de acesso à câmera e à galeria de fotos do seu dispositivo.
        </Text>
        
        <View style={styles.permissionsList}>
          <View style={styles.permissionItem}>
            <Camera size={20} color="#6b7280" />
            <Text style={styles.permissionText}>
              Câmera - Para capturar fotos e vídeos
            </Text>
          </View>
          
          <View style={styles.permissionItem}>
            <Settings size={20} color="#6b7280" />
            <Text style={styles.permissionText}>
              Galeria - Para salvar e acessar mídia
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestAllPermissions}
          >
            <Text style={styles.primaryButtonText}>Conceder Permissões</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openAppSettings}
          >
            <Text style={styles.secondaryButtonText}>Abrir Configurações</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionsList: {
    width: '100%',
    marginBottom: 32,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  permissionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
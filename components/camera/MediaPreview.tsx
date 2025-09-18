import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { X, Trash2, Share, Download } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaPreviewProps {
  uri: string;
  type: 'photo' | 'video';
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  title?: string;
  description?: string;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  uri,
  type,
  visible,
  onClose,
  onDelete,
  title,
  description,
}) => {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: type === 'photo' ? 'image/jpeg' : 'video/mp4',
          dialogTitle: title || 'Compartilhar mídia',
        });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        // Em um app real, você salvaria na galeria ou pasta de downloads
        Alert.alert('Sucesso', 'Arquivo já está salvo no dispositivo');
      } else {
        Alert.alert('Erro', 'Arquivo não encontrado');
      }
    } catch (error) {
      console.error('Erro ao baixar:', error);
      Alert.alert('Erro', 'Não foi possível baixar o arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta mídia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          }
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.overlay} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            {title && <Text style={styles.headerTitle}>{title}</Text>}
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleShare}
              disabled={loading}
            >
              <Share size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleDownload}
              disabled={loading}
            >
              <Download size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {onDelete && (
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleDelete}
                disabled={loading}
              >
                <Trash2 size={24} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {type === 'photo' ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.videoContainer}>
              {/* Para vídeo, você precisaria usar expo-av ou similar */}
              <Text style={styles.videoPlaceholder}>
                Reprodutor de vídeo seria implementado aqui
              </Text>
              <Text style={styles.videoPath}>{uri}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        {description && (
          <View style={styles.footer}>
            <Text style={styles.description}>{description}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoPlaceholder: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  videoPath: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  description: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Alert,
  ScrollView 
} from 'react-native';
import { Camera, X, MapPin, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { PhotoConfig } from '@/types/inspection';

interface PhotoGridProps {
  photoConfig: PhotoConfig;
  photos: string[];
  onTakePhoto: () => void;
  onPreviewPhoto: (uri: string) => void;
  onDeletePhoto: (uri: string) => void;
  onRequestManualLocation?: (uri: string) => void;
  photoMetadata?: Record<string, any>;
  hasError?: boolean;
  errorMessage?: string;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photoConfig,
  photos,
  onTakePhoto,
  onPreviewPhoto,
  onDeletePhoto,
  onRequestManualLocation,
  photoMetadata = {},
  hasError = false,
  errorMessage,
}) => {
  const handleDeletePhoto = (photoUri: string) => {
    Alert.alert(
      'Remover Foto',
      'Tem certeza que deseja remover esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => onDeletePhoto(photoUri) }
      ]
    );
  };

  const canAddMore = photos.length < (photoConfig.maxPhotos || 10);
  const isRequired = photoConfig.required;
  const hasPhotos = photos.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, hasError && styles.titleError]}>
          {photoConfig.label}
          {isRequired && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.count}>
          {photos.length}/{photoConfig.maxPhotos || 10}
        </Text>
      </View>

      {photoConfig.description && (
        <Text style={styles.description}>{photoConfig.description}</Text>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosContainer}
      >
        {photos.map((photoUri, index) => {
          const metadata = photoMetadata[photoUri];
          const hasGps = metadata?.gps;
          
          return (
            <View key={`${photoConfig.name}-${index}`} style={styles.photoContainer}>
              <TouchableOpacity onPress={() => onPreviewPhoto(photoUri)}>
                <Image source={{ uri: photoUri }} style={styles.photo} />
              </TouchableOpacity>
              
              {/* GPS Status Indicator */}
              {!hasGps && onRequestManualLocation && (
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={() => onRequestManualLocation(photoUri)}
                >
                  <MapPin size={12} color="#f59e0b" />
                </TouchableOpacity>
              )}
              
              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleDeletePhoto(photoUri)}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })}

        {canAddMore && (
          <TouchableOpacity style={styles.addButton} onPress={onTakePhoto}>
            <Camera size={24} color="#6b7280" />
            <Text style={styles.addText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {hasError && errorMessage && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={16} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {!hasPhotos && isRequired && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color="#f59e0b" />
          <Text style={styles.warningText}>Foto obrigatória não capturada</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  titleError: {
    color: '#ef4444',
  },
  required: {
    color: '#ef4444',
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  gpsButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
});
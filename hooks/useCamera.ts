import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAdvancedCamera, MediaFile } from './useAdvancedCamera';

export interface PhotoData {
  id: string;
  inspectionId: string;
  moduleType: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}

export const useCamera = () => {
  const advancedCamera = useAdvancedCamera();
  const { db } = useDatabase();

  // Manter compatibilidade com a API existente
  const permission = advancedCamera.hasPermissions ? { granted: true } : { granted: false };
  const requestPermission = advancedCamera.checkPermissions;

  const checkPermissions = async (): Promise<boolean> => {
    if (!permission) {
      const cameraResult = await requestPermission();
      if (!cameraResult.granted) {
        Alert.alert('Erro', 'Permissão de câmera é necessária para capturar fotos');
        return false;
      }
    }

    return await advancedCamera.checkPermissions();
  };

  const takePhoto = async (
    cameraRef: any,
    inspectionId: string,
    moduleType: string,
    photoName: string
  ): Promise<PhotoData | null> => {
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) return null;

    // Buscar dados da inspeção para filename pattern
    const inspection = await db?.getFirstAsync(
      'SELECT client_name, created_at FROM inspections WHERE id = ?',
      [inspectionId]
    );
    
    const clientName = inspection?.client_name || 'Cliente';
    const inspectionDate = inspection?.created_at ? 
      new Date(inspection.created_at).toISOString().split('T')[0].replace(/-/g, '') : 
      new Date().toISOString().split('T')[0].replace(/-/g, '');
    // Usar a nova API avançada
    const mediaFile = await advancedCamera.capturePhoto();
    if (!mediaFile) return null;

    // Salvar na inspeção
    const saved = await advancedCamera.saveMediaToInspection(
      mediaFile,
      inspectionId,
      moduleType,
      photoName,
      photoName,
      clientName,
      inspectionDate
    );

    if (saved) {
      return {
        id: mediaFile.id,
        inspectionId,
        moduleType,
        fileName: `${photoName}_${mediaFile.timestamp}.jpg`,
        filePath: mediaFile.uri,
        fileType: 'image/jpeg',
        fileSize: mediaFile.size || 0,
      };
    }

    return null;
  };

  const getPhotos = async (inspectionId: string, moduleType?: string): Promise<PhotoData[]> => {
    if (!db) return [];

    try {
      const query = moduleType
        ? 'SELECT * FROM media_files WHERE inspection_id = ? AND module_type = ? AND file_type LIKE "image/%" ORDER BY created_at DESC'
        : 'SELECT * FROM media_files WHERE inspection_id = ? AND file_type LIKE "image/%" ORDER BY created_at DESC';
      
      const params = moduleType ? [inspectionId, moduleType] : [inspectionId];
      const result = await db.getAllAsync(query, params);

      return result.map((row: any) => ({
        id: row.id,
        inspectionId: row.inspection_id,
        moduleType: row.module_type,
        fileName: row.file_name,
        filePath: row.file_path,
        fileType: row.file_type,
        fileSize: row.file_size,
      }));
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      return [];
    }
  };

  const deletePhoto = async (photoId: string): Promise<boolean> => {
    if (!db) return false;

    try {
      // Buscar informações da foto
      const photo = await db.getFirstAsync(
        'SELECT * FROM media_files WHERE id = ?',
        [photoId]
      );

      if (!photo) return false;

      // Deletar arquivo físico
      const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photo.file_path);
      }

      // Deletar do banco
      await db.runAsync('DELETE FROM media_files WHERE id = ?', [photoId]);

      return true;
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      return false;
    }
  };

  return {
    // API existente (compatibilidade)
    permission,
    requestPermission,
    checkPermissions,
    takePhoto,
    getPhotos,
    deletePhoto,
    
    // Nova API avançada
    ...advancedCamera,
  };
};
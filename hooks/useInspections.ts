import { useState, useEffect } from 'react';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAuth } from '@/hooks/useAuth';

export interface Inspection {
  id: string;
  userId: string;
  clientName: string;
  workSite: string;
  address?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  status: 'draft' | 'in_progress' | 'completed' | 'synced';
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  synced: boolean;
}

export interface InspectionStats {
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

export const useInspections = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = useDatabase();
  const { user } = useAuth();

  useEffect(() => {
    if (db && user) {
      loadInspections();
    }
  }, [db, user]);

  const loadInspections = async () => {
    if (!db || !user) return;

    try {
      const result = await db.getAllAsync(
        'SELECT * FROM inspections WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      );

      const inspectionsList = result.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        clientName: row.client_name,
        workSite: row.work_site,
        address: row.address,
        gpsLatitude: row.gps_latitude,
        gpsLongitude: row.gps_longitude,
        status: row.status,
        progress: row.progress || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        synced: row.synced === 1,
      }));

      setInspections(inspectionsList);
    } catch (error) {
      console.error('Erro ao carregar inspeções:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInspection = async (data: {
    clientName: string;
    workSite: string;
    address?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
  }) => {
    if (!db || !user) throw new Error('Database ou usuário não disponível');

    const id = generateId();
    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO inspections 
         (id, user_id, client_name, work_site, address, gps_latitude, gps_longitude, status, progress, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user.id,
          data.clientName,
          data.workSite,
          data.address || null,
          data.gpsLatitude || null,
          data.gpsLongitude || null,
          'draft',
          0,
          now,
          now,
        ]
      );

      await loadInspections();
      return id;
    } catch (error) {
      console.error('Erro ao criar inspeção:', error);
      throw error;
    }
  };

  const updateInspection = async (id: string, data: Partial<Inspection>) => {
    if (!db) throw new Error('Database não disponível');

    const now = new Date().toISOString();

    try {
      console.log('Atualizando inspeção:', id, data);
      
      const updates = [];
      const values = [];

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updates.push(`${dbKey} = ?`);
          values.push(value);
        }
      });

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(now, id);

        await db.runAsync(
          `UPDATE inspections SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        console.log('Inspeção atualizada com sucesso');
        await loadInspections();
      }
    } catch (error) {
      console.error('Erro ao atualizar inspeção:', error);
      throw error;
    }
  };

  const deleteInspection = async (id: string) => {
    if (!db) throw new Error('Database não disponível');

    try {
      // Deletar dados relacionados
      await db.runAsync('DELETE FROM module_data WHERE inspection_id = ?', [id]);
      await db.runAsync('DELETE FROM media_files WHERE inspection_id = ?', [id]);
      await db.runAsync('DELETE FROM equipment WHERE inspection_id = ?', [id]);
      
      // Deletar inspeção
      await db.runAsync('DELETE FROM inspections WHERE id = ?', [id]);

      await loadInspections();
    } catch (error) {
      console.error('Erro ao deletar inspeção:', error);
      throw error;
    }
  };

  const getInspectionStats = async (): Promise<InspectionStats> => {
    const stats = {
      pending: inspections.filter(i => i.status === 'draft').length,
      inProgress: inspections.filter(i => i.status === 'in_progress').length,
      completed: inspections.filter(i => i.status === 'completed' || i.status === 'synced').length,
      total: inspections.length,
    };

    return stats;
  };

  const refreshInspections = async () => {
    console.log('Atualizando lista de inspeções...');
    await loadInspections();
  };

  const generateId = () => {
    return 'insp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  return {
    inspections,
    loading,
    createInspection,
    updateInspection,
    deleteInspection,
    getInspectionStats,
    refreshInspections,
  };
};
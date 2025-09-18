import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Conditionally import SQLite only on native platforms
let SQLite: any = null;
if (Platform.OS !== 'web') {
  try {
    SQLite = require('expo-sqlite');
  } catch (error) {
    console.warn('SQLite not available:', error);
  }
}

interface DatabaseContextType {
  db: any | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
});

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

// Mock database for web platform
const createMockDatabase = () => {
  const mockData: Record<string, any[]> = {
    inspections: [],
    module_data: [],
    media_files: [],
    equipment: [],
    users: [],
    checklist_executions: [],
    corrective_actions: [],
    work_orders: [],
  };

  return {
    getAllAsync: async (query: string, params: any[] = []) => {
      console.log('Mock DB getAllAsync:', query, params);
      // Simple mock implementation
      if (query.includes('FROM inspections')) {
        return mockData.inspections;
      }
      if (query.includes('FROM module_data')) {
        return mockData.module_data;
      }
      if (query.includes('FROM media_files')) {
        return mockData.media_files;
      }
      return [];
    },
    getFirstAsync: async (query: string, params: any[] = []) => {
      console.log('Mock DB getFirstAsync:', query, params);
      const results = await mockData.getAllAsync?.(query, params) || [];
      return results[0] || null;
    },
    runAsync: async (query: string, params: any[] = []) => {
      console.log('Mock DB runAsync:', query, params);
      // Simple mock implementation for INSERT/UPDATE/DELETE
      return { changes: 1, lastInsertRowId: Date.now() };
    },
    execAsync: async (query: string) => {
      console.log('Mock DB execAsync:', query);
      return { changes: 0 };
    },
  };
};
export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mounted = { current: true };
    
    const initializeDatabase = async () => {
      try {
        // SQLite is not available on web platform
        if (Platform.OS === 'web' || !SQLite) {
          console.warn('SQLite is not available on web platform. Using mock database.');
          if (mounted.current) {
            setDb(createMockDatabase());
            setIsReady(true);
          }
          return;
        }

        const database = await SQLite.openDatabaseAsync('inspections.db');
        
        // Criar tabelas
        await database.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
          
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS inspections (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            client_name TEXT NOT NULL,
            work_site TEXT NOT NULL,
            address TEXT,
            gps_latitude REAL,
            gps_longitude REAL,
            status TEXT DEFAULT 'draft',
            progress INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            synced INTEGER DEFAULT 0,
            needs_manual_location INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS module_data (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            module_type TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            field_type TEXT NOT NULL,
            is_required INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id)
          );
          
          CREATE UNIQUE INDEX IF NOT EXISTS idx_module_data_unique 
          ON module_data(inspection_id, module_type, field_name);

          CREATE TABLE IF NOT EXISTS media_files (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            module_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            is_required INTEGER DEFAULT 0,
            synced INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            gps_latitude REAL,
            gps_longitude REAL,
            gps_accuracy REAL,
            exif_orientation TEXT,
            photo_type_for_file TEXT,
            client_name_for_file TEXT,
            inspection_date_for_file TEXT,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id)
          );

          CREATE TABLE IF NOT EXISTS equipment (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            module_type TEXT NOT NULL,
            equipment_name TEXT NOT NULL,
            specifications TEXT,
            measurements TEXT,
            status TEXT DEFAULT 'good',
            observations TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id)
          );

          CREATE TABLE IF NOT EXISTS checklist_executions (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            checklist_item_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            measured_value REAL,
            observation TEXT,
            photo_uris TEXT DEFAULT '[]',
            executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            executed_by TEXT NOT NULL,
            validation_result TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id)
          );

          CREATE TABLE IF NOT EXISTS corrective_actions (
            fault_id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            linked_checklist_id TEXT NOT NULL,
            descricao TEXT NOT NULL,
            criticidade TEXT NOT NULL DEFAULT 'media',
            acao_tomada TEXT NOT NULL DEFAULT 'temporaria',
            materiais_usados TEXT DEFAULT '[]',
            custo_estimado REAL DEFAULT 0,
            fotos_before TEXT DEFAULT '[]',
            fotos_after TEXT DEFAULT '[]',
            data_deteccao TEXT NOT NULL,
            data_correcao TEXT,
            responsavel TEXT,
            status TEXT NOT NULL DEFAULT 'pendente',
            os_gerada TEXT,
            observacoes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id)
          );

          CREATE TABLE IF NOT EXISTS work_orders (
            os_number TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            fault_id TEXT,
            description TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'normal',
            estimated_cost REAL DEFAULT 0,
            actual_cost REAL,
            assigned_to TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            scheduled_date TEXT,
            completed_at TEXT,
            notes TEXT,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id),
            FOREIGN KEY (fault_id) REFERENCES corrective_actions(fault_id)
          );
          CREATE INDEX IF NOT EXISTS idx_inspections_user ON inspections(user_id);
          CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
          CREATE INDEX IF NOT EXISTS idx_module_data_inspection ON module_data(inspection_id);
          CREATE INDEX IF NOT EXISTS idx_media_files_inspection ON media_files(inspection_id);
          CREATE INDEX IF NOT EXISTS idx_equipment_inspection ON equipment(inspection_id);
          CREATE INDEX IF NOT EXISTS idx_module_data_module_type ON module_data(module_type);
          CREATE INDEX IF NOT EXISTS idx_media_files_module_type ON media_files(module_type);
          CREATE INDEX IF NOT EXISTS idx_checklist_executions_inspection ON checklist_executions(inspection_id);
          CREATE INDEX IF NOT EXISTS idx_corrective_actions_inspection ON corrective_actions(inspection_id);
          CREATE INDEX IF NOT EXISTS idx_work_orders_inspection ON work_orders(inspection_id);
        `);

        if (mounted.current) {
          setDb(database);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        console.warn('Falha ao inicializar banco de dados:', error);
        if (mounted.current) {
          // Em caso de erro, usar mock database
          setDb(createMockDatabase());
          setIsReady(true);
        }
      }
    };

    initializeDatabase();

    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};
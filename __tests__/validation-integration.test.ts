import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useModuleData } from '@/hooks/useModuleData';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/providers/DatabaseProvider');
vi.mock('@/hooks/useAuth');

const mockDb = {
  getAllAsync: vi.fn(),
  getFirstAsync: vi.fn(),
  runAsync: vi.fn(),
};

const mockUser = {
  id: 'user123',
  name: 'João Silva',
  email: 'joao@empresa.com',
  role: 'inspector',
};

describe('Validation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDatabase as any).mockReturnValue({ db: mockDb, isReady: true });
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  describe('Module-level validation still works', () => {
    it('should validate required fields at module level independently', async () => {
      // Setup: Mock module data with missing required field
      mockDb.getAllAsync.mockResolvedValue([
        // Missing client_name which is required
        { module_type: 'client', field_name: 'endereco_completo', field_value: 'Rua A, 123' },
      ]);

      mockDb.getFirstAsync.mockResolvedValue(null); // No photos

      const { result } = renderHook(() => useModuleData('insp_123', 'client'));

      // Wait for data to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      let validationResult;
      await act(async () => {
        validationResult = result.current.validateModule();
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Nome do Cliente');
    });

    it('should validate required photos at module level independently', async () => {
      // Setup: Mock module data without required photos
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'endereco_completo', field_value: 'Rua A, 123' },
            { module_type: 'client', field_name: 'responsavel_local', field_value: 'João Silva' },
            { module_type: 'client', field_name: 'horario_chegada', field_value: '08:00' },
            { module_type: 'client', field_name: 'data_execucao', field_value: '2024-01-15' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([]); // No photos
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useModuleData('insp_123', 'client'));

      // Wait for data to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      let validationResult;
      await act(async () => {
        validationResult = result.current.validateModule();
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('FOTO 1 - Fachada');
    });
  });

  describe('Cross-module validation scenarios', () => {
    it('should detect missing required modules', async () => {
      // Setup: Mock data missing entire required module
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            // Only client module data, missing transformers module
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([
            { module_type: 'client', file_name: 'fachada_123.jpg', photo_type_for_file: 'fachada' },
            { module_type: 'transformers', file_name: 'proximidade_123.jpg', photo_type_for_file: 'proximidade' },
            { module_type: 'cabin_type', file_name: 'placa_123.jpg', photo_type_for_file: 'placa' },
            { module_type: 'bt', file_name: 'quadro_geral_123.jpg', photo_type_for_file: 'quadro_geral' },
          ]);
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useReportGeneration());

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateFinalReport('insp_123');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.missingFields).toContain('Módulo "Transformadores"');
      expect(validationResult.errorsSample).toContain('O módulo "Transformadores" é obrigatório e não foi preenchido.');
    });

    it('should validate conditional fields based on cabin type', async () => {
      // Setup: Mock data with CONVENCIONAL cabin type but missing MT-specific fields
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'cabin_type', field_name: 'cabin_type', field_value: 'CONVENCIONAL' },
            { module_type: 'cabin_type', field_name: 'voltage_level', field_value: '13.8 kV' },
            { module_type: 'cabin_type', field_name: 'installation_type', field_value: 'Aérea' },
            { module_type: 'cabin_type', field_name: 'grounding_system', field_value: 'TN-S' },
            // Missing MT module data which is required for CONVENCIONAL
            { module_type: 'general_state', field_name: 'conclusion', field_value: 'Conclusão teste' },
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([
            { module_type: 'client', file_name: 'fachada_123.jpg', photo_type_for_file: 'fachada' },
            { module_type: 'transformers', file_name: 'proximidade_123.jpg', photo_type_for_file: 'proximidade' },
            { module_type: 'cabin_type', file_name: 'placa_123.jpg', photo_type_for_file: 'placa' },
            { module_type: 'bt', file_name: 'quadro_geral_123.jpg', photo_type_for_file: 'quadro_geral' },
          ]);
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useReportGeneration());

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateFinalReport('insp_123');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.missingFields).toContain('Módulo "Média Tensão (MT)"');
    });
  });

  describe('Error message formatting', () => {
    it('should provide user-friendly error messages', async () => {
      // Setup: Mock data with multiple validation errors
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            // Missing multiple required fields
            { module_type: 'client', field_name: 'authorization', field_value: 'false' },
            // Missing conclusion
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([]); // No photos
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useReportGeneration());

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateFinalReport('insp_123');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errorsSample.length).toBeGreaterThan(0);
      
      // Check that error messages are user-friendly and specific
      validationResult.errorsSample.forEach(error => {
        expect(error).toMatch(/^(O campo|A foto|O módulo|Por favor)/);
        expect(error).toContain('obrigatório');
      });
    });
  });
});
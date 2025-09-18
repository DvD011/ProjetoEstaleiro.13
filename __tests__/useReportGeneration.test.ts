import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/providers/DatabaseProvider');
vi.mock('@/hooks/useAuth');
vi.mock('expo-file-system');

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

describe('useReportGeneration - Final Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDatabase as any).mockReturnValue({ db: mockDb, isReady: true });
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  describe('validateFinalReport', () => {
    it('should return valid when all required fields and photos are present', async () => {
      // Setup: Mock complete inspection data
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'endereco_completo', field_value: 'Rua A, 123' },
            { module_type: 'client', field_name: 'responsavel_local', field_value: 'João Silva' },
            { module_type: 'client', field_name: 'horario_chegada', field_value: '08:00' },
            { module_type: 'client', field_name: 'data_execucao', field_value: '2024-01-15' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'cabin_type', field_name: 'cabin_type', field_value: 'CONVENCIONAL' },
            { module_type: 'cabin_type', field_name: 'voltage_level', field_value: '13.8 kV' },
            { module_type: 'cabin_type', field_name: 'installation_type', field_value: 'Aérea' },
            { module_type: 'cabin_type', field_name: 'grounding_system', field_value: 'TN-S' },
            { module_type: 'procedures', field_name: 'safety_equipment', field_value: 'true' },
            { module_type: 'procedures', field_name: 'area_isolation', field_value: 'true' },
            { module_type: 'procedures', field_name: 'voltage_verification', field_value: 'true' },
            { module_type: 'procedures', field_name: 'grounding_installation', field_value: 'true' },
            { module_type: 'procedures', field_name: 'signaling_protection', field_value: 'true' },
            { module_type: 'maintenance', field_name: 'last_maintenance', field_value: '2023-12-01' },
            { module_type: 'maintenance', field_name: 'maintenance_frequency', field_value: 'Trimestral' },
            { module_type: 'maintenance', field_name: 'maintenance_type', field_value: 'Preventiva' },
            { module_type: 'maintenance', field_name: 'maintenance_company', field_value: 'Empresa Manutenção' },
            { module_type: 'transformers', field_name: 'manufacturer', field_value: 'WEG' },
            { module_type: 'transformers', field_name: 'serial_number', field_value: 'WEG123456' },
            { module_type: 'transformers', field_name: 'power_kva', field_value: '500' },
            { module_type: 'transformers', field_name: 'primary_voltage', field_value: '13800' },
            { module_type: 'transformers', field_name: 'secondary_voltage', field_value: '220' },
            { module_type: 'transformers', field_name: 'installation_year', field_value: '2020' },
            { module_type: 'grid_connection', field_name: 'concessionaria', field_value: 'CPFL' },
            { module_type: 'grid_connection', field_name: 'codigo_consumidor', field_value: 'COD123' },
            { module_type: 'grid_connection', field_name: 'demanda_kw', field_value: '100' },
            { module_type: 'grid_connection', field_name: 'tariff_type', field_value: 'Convencional' },
            { module_type: 'mt', field_name: 'mt_voltage_level', field_value: '13.8 kV' },
            { module_type: 'mt', field_name: 'protection_type', field_value: 'Disjuntor' },
            { module_type: 'mt', field_name: 'switchgear_type', field_value: 'Cubículo Metálico' },
            { module_type: 'bt', field_name: 'bt_voltage_level', field_value: '220V' },
            { module_type: 'bt', field_name: 'distribution_type', field_value: 'Radial' },
            { module_type: 'bt', field_name: 'main_breaker', field_value: 'Disjuntor 400A' },
            { module_type: 'epcs', field_name: 'fire_extinguisher', field_value: 'true' },
            { module_type: 'general_state', field_name: 'overall_condition', field_value: 'Boa' },
            { module_type: 'general_state', field_name: 'compliance_status', field_value: 'Conforme' },
            { module_type: 'general_state', field_name: 'conclusion', field_value: 'Instalação em conformidade com as normas técnicas.' },
            { module_type: 'reconnection', field_name: 'reconnection_authorized', field_value: 'true' },
            { module_type: 'reconnection', field_name: 'final_tests', field_value: 'true' },
            { module_type: 'reconnection', field_name: 'system_operational', field_value: 'true' },
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

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.missingFields).toHaveLength(0);
      expect(validationResult.criticalErrors).toHaveLength(0);
    });

    it('should return invalid when required field is missing', async () => {
      // Setup: Mock incomplete inspection data (missing client_name)
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            // Missing client_name field
            { module_type: 'client', field_name: 'endereco_completo', field_value: 'Rua A, 123' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
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
      expect(validationResult.missingFields).toContain('Campo "Nome do Cliente" no módulo "Cliente/Obra"');
      expect(validationResult.errorsSample).toContain('O campo "Nome do Cliente" no módulo "Cliente/Obra" é obrigatório.');
    });

    it('should return invalid when required photo is missing', async () => {
      // Setup: Mock data with missing required photo
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'general_state', field_name: 'conclusion', field_value: 'Conclusão teste' },
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([
            // Missing fachada photo
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
      expect(validationResult.missingFields).toContain('Foto "FOTO 1 - Fachada"');
      expect(validationResult.errorsSample).toContain('A foto "FOTO 1 - Fachada" é obrigatória para o relatório.');
    });

    it('should return invalid when authorization is not granted', async () => {
      // Setup: Mock data without authorization
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'false' }, // Not authorized
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
      expect(validationResult.criticalErrors).toContain('A autorização dos responsáveis no módulo "Cliente/Obra" é obrigatória para gerar o relatório.');
      expect(validationResult.missingFields).toContain('Autorização dos Responsáveis no módulo "Cliente/Obra"');
    });

    it('should return invalid when conclusion is empty', async () => {
      // Setup: Mock data without conclusion
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'general_state', field_name: 'conclusion', field_value: '' }, // Empty conclusion
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
      expect(validationResult.criticalErrors).toContain('O campo "Conclusão da Inspeção" no módulo "Estado Geral" é obrigatório.');
      expect(validationResult.missingFields).toContain('Conclusão da Inspeção no módulo "Estado Geral"');
    });

    it('should return invalid when "Outro" field is selected but not specified', async () => {
      // Setup: Mock data with "Outro" selected but no specification
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'cabin_type', field_name: 'installation_type', field_value: 'Outro' },
            // Missing installation_type_other field
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
      expect(validationResult.missingFields).toContain('Campo "Tipo de Instalação" (especificação em "Outro") no módulo "Tipo de Cabine"');
      expect(validationResult.errorsSample).toContain('Por favor, especifique o campo "Tipo de Instalação" no módulo "Tipo de Cabine".');
    });

    it('should handle database errors gracefully', async () => {
      // Setup: Mock database error
      mockDb.getAllAsync.mockRejectedValue(new Error('Database connection failed'));

      const { result } = renderHook(() => useReportGeneration());

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateFinalReport('insp_123');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.missingFields).toContain('Erro na validação');
      expect(validationResult.criticalErrors).toContain('Falha na validação do sistema');
    });
  });

  describe('generateReportWithMode - Integration with Validation', () => {
    it('should prevent report generation when validation fails', async () => {
      // Setup: Mock incomplete data that will fail validation
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            // Missing required fields
            { module_type: 'client', field_name: 'authorization', field_value: 'false' },
          ]);
        } else if (query.includes('media_files')) {
          return Promise.resolve([]); // No photos
        }
        return Promise.resolve([]);
      });

      mockDb.getFirstAsync.mockResolvedValue({
        id: 'insp_123',
        client_name: 'Empresa ABC',
        work_site: 'Local Teste',
        created_at: '2024-01-15T10:00:00Z',
      });

      const { result } = renderHook(() => useReportGeneration());

      let reportResult;
      await act(async () => {
        reportResult = await result.current.generateReportWithMode('insp_123', 'compatibility');
      });

      expect(reportResult.success).toBe(false);
      expect(reportResult.validation_errors).toBeDefined();
      expect(reportResult.critical_errors).toBeDefined();
      expect(reportResult.error).toContain('Validação falhou');
    });

    it('should proceed with report generation when validation passes', async () => {
      // Setup: Mock complete data that will pass validation
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('module_data')) {
          return Promise.resolve([
            { module_type: 'client', field_name: 'client_name', field_value: 'Empresa ABC' },
            { module_type: 'client', field_name: 'endereco_completo', field_value: 'Rua A, 123' },
            { module_type: 'client', field_name: 'responsavel_local', field_value: 'João Silva' },
            { module_type: 'client', field_name: 'horario_chegada', field_value: '08:00' },
            { module_type: 'client', field_name: 'data_execucao', field_value: '2024-01-15' },
            { module_type: 'client', field_name: 'authorization', field_value: 'true' },
            { module_type: 'general_state', field_name: 'conclusion', field_value: 'Instalação conforme.' },
            // Add other required fields...
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

      mockDb.getFirstAsync.mockResolvedValue({
        id: 'insp_123',
        client_name: 'Empresa ABC',
        work_site: 'Local Teste',
        created_at: '2024-01-15T10:00:00Z',
      });

      // Mock successful HTML generation (since Supabase config won't be available in tests)
      const { result } = renderHook(() => useReportGeneration());

      let reportResult;
      await act(async () => {
        reportResult = await result.current.generateReportWithMode('insp_123', 'compatibility');
      });

      // Should proceed to HTML generation since validation passes
      expect(reportResult.success).toBe(true);
      expect(reportResult.pdf_url).toBeDefined();
    });
  });
});
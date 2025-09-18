import { useState } from 'react';
import { Alert } from 'react-native';
import { useDatabase } from '@/providers/DatabaseProvider';
import { useAuth } from '@/hooks/useAuth';
import { MODULE_CONFIGURATIONS } from '@/types/inspection';
import { PHOTO_SPECIFICATION } from '@/utils/photoSpecification';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errorsSample: string[];
  criticalErrors: string[];
}

export interface ExportResult {
  success: boolean;
  pdf_url?: string;
  json_url?: string;
  file_name?: string;
  version?: number;
  export_log_id?: string;
  error?: string;
  validation_errors?: string[];
  critical_errors?: string[];
}

export interface ExportOptions {
  mode?: 'compatibility' | 'enriched';
  send_email?: boolean;
  recipient_emails?: string[];
  include_json?: boolean;
}

export const useReportGeneration = () => {
  const [loading, setLoading] = useState(false);
  const { db } = useDatabase();
  const { user } = useAuth();

  const validateFinalReport = async (inspectionId: string): Promise<ValidationResult> => {
    if (!db) {
      return {
        isValid: false,
        missingFields: ['Erro na validação'],
        errorsSample: ['Database não disponível'],
        criticalErrors: ['Falha na validação do sistema'],
      };
    }

    try {
      console.log('Iniciando validação final do relatório para inspeção:', inspectionId);
      
      const missingFields: string[] = [];
      const errorsSample: string[] = [];
      const criticalErrors: string[] = [];

      // Buscar todos os dados dos módulos
      const moduleData = await db.getAllAsync(
        'SELECT * FROM module_data WHERE inspection_id = ?',
        [inspectionId]
      );

      // Buscar todas as fotos
      const mediaFiles = await db.getAllAsync(
        'SELECT * FROM media_files WHERE inspection_id = ? AND file_type LIKE "image/%"',
        [inspectionId]
      );

      // Organizar dados por módulo
      const modulesByType: Record<string, Record<string, string>> = {};
      moduleData.forEach((item: any) => {
        if (!modulesByType[item.module_type]) {
          modulesByType[item.module_type] = {};
        }
        modulesByType[item.module_type][item.field_name] = item.field_value;
      });

      // Organizar fotos por tipo
      const photosByType: Record<string, any[]> = {};
      mediaFiles.forEach((file: any) => {
        const photoType = file.photo_type_for_file || 'general';
        if (!photosByType[photoType]) {
          photosByType[photoType] = [];
        }
        photosByType[photoType].push(file);
      });

      console.log('Dados organizados:', { modulesByType, photosByType });

      // Validar módulos obrigatórios
      const requiredModules = Object.values(MODULE_CONFIGURATIONS).filter(m => m.required);
      
      for (const moduleConfig of requiredModules) {
        const moduleFields = modulesByType[moduleConfig.id] || {};
        
        // Verificar se o módulo tem dados
        if (Object.keys(moduleFields).length === 0) {
          missingFields.push(`Módulo "${moduleConfig.title}"`);
          errorsSample.push(`O módulo "${moduleConfig.title}" é obrigatório e não foi preenchido.`);
          continue;
        }

        // Validar campos obrigatórios do módulo
        const requiredFields = moduleConfig.fields.filter(f => f.required);
        for (const field of requiredFields) {
          const fieldValue = moduleFields[field.name];
          
          if (field.type === 'boolean') {
            // Campos boolean críticos
            if (field.name === 'authorization' && fieldValue !== 'true') {
              criticalErrors.push(`A autorização dos responsáveis no módulo "${moduleConfig.title}" é obrigatória para gerar o relatório.`);
              missingFields.push(`Autorização dos Responsáveis no módulo "${moduleConfig.title}"`);
            }
            continue;
          }
          
          if (!fieldValue || fieldValue.toString().trim() === '') {
            const errorMessage = `O campo "${field.label}" no módulo "${moduleConfig.title}" é obrigatório.`;
            
            // Campos críticos que impedem geração do relatório
            if (field.name === 'conclusion' && moduleConfig.id === 'general_state') {
              criticalErrors.push(errorMessage);
            }
            
            missingFields.push(`Campo "${field.label}" no módulo "${moduleConfig.title}"`);
            errorsSample.push(errorMessage);
          } else if (fieldValue === 'Outro' && field.options?.includes('Outro')) {
            // Verificar se campo "Outro" foi especificado
            const otherFieldName = `${field.name}_other`;
            const otherValue = moduleFields[otherFieldName];
            
            if (!otherValue || otherValue.toString().trim() === '') {
              missingFields.push(`Campo "${field.label}" (especificação em "Outro") no módulo "${moduleConfig.title}"`);
              errorsSample.push(`Por favor, especifique o campo "${field.label}" no módulo "${moduleConfig.title}".`);
            }
          }
        }

        // Validar fotos obrigatórias do módulo
        const requiredPhotos = moduleConfig.photos.filter(p => p.required);
        for (const photo of requiredPhotos) {
          const modulePhotos = mediaFiles.filter(f => 
            f.module_type === moduleConfig.id && 
            (f.photo_type_for_file === photo.name || f.file_name.includes(photo.name))
          );
          
          if (modulePhotos.length === 0) {
            missingFields.push(`Foto "${photo.label}"`);
            errorsSample.push(`A foto "${photo.label}" é obrigatória para o relatório.`);
          }
        }
      }

      // Validar 4 fotos obrigatórias específicas
      const requiredPhotoTypes = ['fachada', 'proximidade', 'placa', 'quadro_geral'];
      for (const photoType of requiredPhotoTypes) {
        const photoSpec = PHOTO_SPECIFICATION.photos.find(p => p.name === photoType);
        if (photoSpec && !photosByType[photoType]?.length) {
          missingFields.push(`Foto "${photoSpec.label}"`);
          errorsSample.push(`A foto "${photoSpec.label}" é obrigatória para o relatório.`);
        }
      }

      const isValid = missingFields.length === 0 && criticalErrors.length === 0;
      
      console.log('Resultado da validação final:', {
        isValid,
        missingFieldsCount: missingFields.length,
        criticalErrorsCount: criticalErrors.length,
      });

      return {
        isValid,
        missingFields,
        errorsSample,
        criticalErrors,
      };
    } catch (error) {
      console.error('Erro na validação final:', error);
      return {
        isValid: false,
        missingFields: ['Erro na validação'],
        errorsSample: ['Falha na validação do sistema'],
        criticalErrors: ['Falha na validação do sistema'],
      };
    }
  };

  const generateReport = async (
    inspectionId: string, 
    mode: 'compatibility' | 'enriched' = 'compatibility'
  ): Promise<ExportResult> => {
    return generateReportWithOptions(inspectionId, {
      mode,
      send_email: true,
      include_json: true,
    });
  };

  const generateReportWithMode = async (
    inspectionId: string,
    mode: 'compatibility' | 'enriched'
  ): Promise<ExportResult> => {
    return generateReportWithOptions(inspectionId, {
      mode,
      send_email: false,
      include_json: true,
    });
  };

  const generateReportWithOptions = async (
    inspectionId: string,
    options: ExportOptions
  ): Promise<ExportResult> => {
    if (!user) {
      return {
        success: false,
        error: 'Usuário não autenticado',
      };
    }

    setLoading(true);
    try {
      console.log('Iniciando geração de relatório:', { inspectionId, options });

      // Executar validação antes da geração
      const validation = await validateFinalReport(inspectionId);
      
      if (!validation.isValid && validation.criticalErrors.length > 0) {
        console.log('Validação falhou com erros críticos:', validation.criticalErrors);
        return {
          success: false,
          error: `Validação falhou: ${validation.criticalErrors.slice(0, 3).join(', ')}${validation.criticalErrors.length > 3 ? '...' : ''}`,
          validation_errors: validation.missingFields,
          critical_errors: validation.criticalErrors,
        };
      }

      // Buscar e-mails dos destinatários se não fornecidos
      let recipientEmails = options.recipient_emails || [];
      if (options.send_email && recipientEmails.length === 0) {
        recipientEmails = await getDefaultRecipients(inspectionId);
      }

      // Chamar Edge Function para gerar relatório
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        // Fallback para geração local (modo de desenvolvimento)
        return {
          success: true,
          pdf_url: `data:application/pdf;base64,${btoa('PDF simulado')}`,
          file_name: `relatorio_${inspectionId}_v1.pdf`,
          version: 1,
        };
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          inspection_id: inspectionId,
          mode: options.mode || 'compatibility',
          recipient_emails: recipientEmails,
          send_email: options.send_email || false,
          include_json: options.include_json || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Relatório gerado com sucesso:', result);

      return {
        success: true,
        pdf_url: result.pdf_url,
        json_url: result.json_url,
        file_name: result.file_name,
        version: result.version,
        export_log_id: result.export_log_id,
      };

    } catch (error) {
      console.error('Erro na geração do relatório:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido na geração do relatório',
      };
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRecipients = async (inspectionId: string): Promise<string[]> => {
    if (!db) return [];

    try {
      // Buscar e-mail do responsável local (se for um e-mail válido)
      const responsavelResult = await db.getFirstAsync(
        'SELECT field_value FROM module_data WHERE inspection_id = ? AND module_type = ? AND field_name = ?',
        [inspectionId, 'client', 'responsavel_local']
      );

      const recipients: string[] = [];
      
      if (responsavelResult?.field_value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(responsavelResult.field_value)) {
          recipients.push(responsavelResult.field_value);
        }
      }

      // Adicionar e-mail padrão da empresa se não houver outros
      if (recipients.length === 0) {
        recipients.push('contato@joule.com.br');
      }

      return recipients;
    } catch (error) {
      console.error('Erro ao buscar destinatários padrão:', error);
      return ['contato@joule.com.br'];
    }
  };

  const getExportHistory = async (inspectionId: string): Promise<any[]> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return [];
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/export_logs?inspection_id=eq.${inspectionId}&order=version.desc`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de exportação:', error);
    }
    
    return [];
  };

  const retryFailedExport = async (exportLogId: string): Promise<boolean> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return false;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/retry-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ export_log_id: exportLogId }),
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao tentar novamente a exportação:', error);
      return false;
    }
  };

  return {
    loading,
    validateFinalReport,
    generateReport,
    generateReportWithMode,
    generateReportWithOptions,
    getExportHistory,
    retryFailedExport,
  };
};
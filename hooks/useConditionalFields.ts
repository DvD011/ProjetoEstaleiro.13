import { useMemo } from 'react';
import { CABIN_TYPES, CabinTypeConfig, ModuleFieldConfig, PhotoConfig } from '@/types/inspection';

export interface ConditionalFieldsResult {
  visibleFields: ModuleFieldConfig[];
  visiblePhotos: PhotoConfig[];
  requiredFields: string[];
  cabinTypeConfig?: CabinTypeConfig;
}

export const useConditionalFields = (
  moduleId: string,
  allFields: ModuleFieldConfig[],
  allPhotos: PhotoConfig[],
  moduleData: Record<string, string>
): ConditionalFieldsResult => {
  
  return useMemo(() => {
    // Se não for o módulo cabin_type, retornar todos os campos
    if (moduleId !== 'cabin_type') {
      return {
        visibleFields: allFields,
        visiblePhotos: allPhotos,
        requiredFields: allFields.filter(f => f.required).map(f => f.name),
      };
    }

    const selectedCabinType = moduleData.cabin_type;
    const cabinTypeConfig = CABIN_TYPES.find(type => type.key === selectedCabinType);
    
    console.log('Tipo de cabine selecionado:', selectedCabinType);
    console.log('Configuração encontrada:', cabinTypeConfig);

    // Campos sempre visíveis (básicos)
    const baseFields = allFields.filter(field => 
      ['cabin_type', 'voltage_level', 'installation_type', 'grounding_system'].includes(field.name)
    );

    // Fotos sempre visíveis (padrão + 4 fotos obrigatórias)
    const basePhotos = allPhotos.filter(photo => 
      ['cabin_external', 'cabin_internal', 'nameplate', 'grounding_system', 
       'fachada', 'proximidade', 'placa', 'quadro_geral'].includes(photo.name)
    );

    let visibleFields = [...baseFields];
    let visiblePhotos = [...basePhotos];
    let requiredFields = baseFields.filter(f => f.required).map(f => f.name);

    // Adicionar campos condicionais baseados no tipo de cabine
    if (cabinTypeConfig?.conditional_items) {
      const conditionalFieldNames = cabinTypeConfig.conditional_items.fields || [];
      const conditionalPhotoNames = cabinTypeConfig.conditional_items.photos || [];

      // Adicionar campos condicionais
      const conditionalFields = allFields.filter(field => 
        conditionalFieldNames.includes(field.name)
      );
      visibleFields.push(...conditionalFields);

      // Adicionar fotos condicionais
      const conditionalPhotos = allPhotos.filter(photo => 
        conditionalPhotoNames.includes(photo.name)
      );
      visiblePhotos.push(...conditionalPhotos);

      // Atualizar campos obrigatórios
      requiredFields.push(...conditionalFields.filter(f => f.required).map(f => f.name));

      console.log('Campos condicionais adicionados:', conditionalFieldNames);
      console.log('Fotos condicionais adicionadas:', conditionalPhotoNames);
    }

    return {
      visibleFields,
      visiblePhotos,
      requiredFields,
      cabinTypeConfig,
    };
  }, [moduleId, allFields, allPhotos, moduleData.cabin_type]);
};

// Função auxiliar para obter aliases de tipos antigos
export const getCabinTypeFromAlias = (alias: string): string | null => {
  for (const cabinType of CABIN_TYPES) {
    if (cabinType.aliases.includes(alias) || cabinType.key === alias) {
      return cabinType.key;
    }
  }
  return null;
};

// Função auxiliar para migrar tipos antigos
export const migrateCabinType = (oldType: string): string => {
  const mapping: Record<string, string> = {
    'Alvenaria': 'CONVENCIONAL',
    'Metálica': 'CONVENCIONAL', 
    'Compacta': 'SIMPLIFICADA',
    'Blindada': 'CONVENCIONAL',
    'Abrigada': 'CONVENCIONAL',
    'PosteTrafo': 'ESTALEIRO',
    'Aerea': 'ESTALEIRO',
    'Poste': 'ESTALEIRO',
    'SemDisjuntorMT': 'SIMPLIFICADA',
    'Fusivel': 'SIMPLIFICADA',
    'ComDisjuntorMT': 'CONVENCIONAL',
    'Padrao': 'CONVENCIONAL',
    'Completa': 'CONVENCIONAL',
  };

  return mapping[oldType] || oldType;
};
export interface InspectionData {
  id: string;
  title: string;
  location: string;
  inspector_name: string;
  inspection_date: string;
  weather_conditions?: string;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  notes?: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ModuleData {
  id: string;
  inspection_id: string;
  module_type: string;
  module_number: string;
  data: Record<string, any>;
  photos: string[];
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ModuleFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'measurement' | 'photo' | 'datetime' | 'date' | 'time' | 'textarea';
  required?: boolean;
  options?: string[];
  unit?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  placeholder?: string;
  description?: string;
  conditionalOn?: {
    field: string;
    value: any;
  };
}

export interface PhotoConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  maxPhotos?: number;
  orientation?: 'landscape' | 'portrait' | 'any';
}

export interface MeasurementConfig {
  name: string;
  label: string;
  unit: string;
  type: 'voltage' | 'current' | 'temperature' | 'resistance' | 'frequency' | 'power' | 'other';
  range?: {
    min: number;
    max: number;
  };
  required?: boolean;
  description?: string;
}

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  icon: string;
  fields: ModuleFieldConfig[];
  photos: PhotoConfig[];
  measurements?: MeasurementConfig[];
  instructions?: string[];
}

export interface CabinTypeConfig {
  key: string;
  label: string;
  description: string;
  aliases: string[];
  conditional_items: {
    fields: string[];
    photos: string[];
    modules: string[];
  };
  checklist_items?: string[]; // IDs dos itens de checklist específicos para este tipo
}

export const CABIN_TYPES: CabinTypeConfig[] = [
  {
    key: 'CONVENCIONAL',
    label: 'Cabine Convencional',
    description: 'Cabine de alvenaria ou metálica com disjuntor MT, proteção completa e medição',
    aliases: ['Alvenaria', 'Metálica', 'Blindada', 'Abrigada', 'ComDisjuntorMT', 'Padrao', 'Completa'],
    conditional_items: {
      fields: ['mt_breaker_type', 'protection_relay', 'metering_system'],
      photos: ['mt_breaker', 'protection_panel', 'metering_equipment'],
      modules: ['mt', 'grid_connection'],
      checklist_items: ['vis_ext_001', 'trf_001', 'trf_002', 'mt_001', 'mt_002', 'bt_001', 'grd_001', 'iso_001']
    }
  },
  {
    key: 'SIMPLIFICADA',
    label: 'Cabine Simplificada',
    description: 'Cabine compacta sem disjuntor MT, proteção por fusível',
    aliases: ['Compacta', 'SemDisjuntorMT', 'Fusivel'],
    conditional_items: {
      fields: ['fuse_type', 'simplified_protection'],
      photos: ['fuse_protection', 'simplified_panel'],
      modules: ['bt'],
      checklist_items: ['vis_ext_001', 'trf_001', 'trf_002', 'fus_001', 'bt_001', 'grd_001']
    }
  },
  {
    key: 'ESTALEIRO',
    label: 'Instalação em Estaleiro/Poste',
    description: 'Transformador em poste ou instalação aérea',
    aliases: ['PosteTrafo', 'Aerea', 'Poste'],
    conditional_items: {
      fields: ['pole_type', 'aerial_installation'],
      photos: ['pole_installation', 'aerial_view'],
      modules: ['transformers'],
      checklist_items: ['est_001', 'est_002', 'trf_001', 'trf_002', 'bt_003', 'grd_001']
    }
  }
];

export const MODULE_CONFIGURATIONS: Record<string, ModuleConfig> = {
  'client': {
    id: 'client',
    title: 'Cliente/Obra',
    description: 'Dados básicos do cliente, localização, horários e responsáveis',
    order: 1,
    required: true,
    icon: 'Building',
    fields: [
      {
        name: 'client_legal_name',
        label: 'Razão Social do Cliente',
        type: 'text',
        required: true,
        placeholder: 'Ex: NOVA RIOTEL EMPREENDIMENTOS HOTELEIROS LTDA'
      },
      {
        name: 'client_trade_name',
        label: 'Nome Fantasia',
        type: 'text',
        placeholder: 'Nome comercial da empresa (opcional)'
      },
      {
        name: 'client_site_name',
        label: 'Nome do Local/Obra',
        type: 'text',
        required: true,
        placeholder: 'Ex: FAIRMONT RJ COPACABANA'
      },
      {
        name: 'client_site_address',
        label: 'Endereço do Local',
        type: 'textarea',
        required: true,
        placeholder: 'Ex: Av. Atlântica, 4240 Copacabana - Rio de Janeiro RJ'
      },
      {
        name: 'client_received_by_name',
        label: 'Funcionário que Recebeu a Equipe',
        type: 'text',
        placeholder: 'Nome do funcionário do cliente que recebeu nossa equipe'
      },
      {
        name: 'responsavel_local',
        label: 'Responsável Local',
        type: 'text',
        required: true,
        placeholder: 'Nome do responsável no local'
      },
      {
        name: 'start_travel',
        label: 'Início do Deslocamento',
        type: 'time',
        placeholder: 'HH:MM'
      },
      {
        name: 'horario_chegada',
        label: 'Horário de Chegada',
        type: 'time',
        required: true
      },
      {
        name: 'service_start_time',
        label: 'Início dos Serviços',
        type: 'time',
        placeholder: 'HH:MM'
      },
      {
        name: 'data_execucao',
        label: 'Data de Execução',
        type: 'date',
        required: true
      },
      {
        name: 'report_type',
        label: 'Tipo de Relatório',
        type: 'select',
        required: true,
        options: ['MANUTENÇÃO PREVENTIVA', 'MANUTENÇÃO CORRETIVA', 'OUTRO']
      },
      {
        name: 'os_number',
        label: 'Número da OS',
        type: 'text',
        placeholder: 'Número da ordem de serviço (opcional)'
      },
      {
        name: 'legend_instructions',
        label: 'Instruções da Legenda',
        type: 'textarea',
        placeholder: 'Texto da legenda do modelo (opcional)'
      },
      {
        name: 'authorization',
        label: 'Autorização dos Responsáveis',
        type: 'boolean',
        required: true
      }
    ],
    photos: [
      {
        name: 'fachada',
        label: 'FOTO 1 - Fachada',
        description: 'Vista frontal da cabine/instalação',
        required: true,
        maxPhotos: 1,
        orientation: 'landscape'
      }
    ]
  },

  'cabin_type': {
    id: 'cabin_type',
    title: 'Tipo de Cabine',
    description: 'Especificações técnicas, tipo de instalação e aterramento',
    order: 2,
    required: true,
    icon: 'Shield',
    fields: [
      {
        name: 'cabin_type',
        label: 'Tipo de Cabine',
        type: 'select',
        required: true,
        options: ['CONVENCIONAL', 'SIMPLIFICADA', 'ESTALEIRO', 'OUTRO']
      },
      {
        name: 'voltage_level',
        label: 'Nível de Tensão',
        type: 'select',
        required: true,
        options: ['13.8 kV', '23 kV', '34.5 kV', 'Outro']
      },
      {
        name: 'installation_type',
        label: 'Tipo de Instalação',
        type: 'select',
        required: true,
        options: ['Aérea', 'Subterrânea', 'Mista', 'Outro']
      },
      {
        name: 'grounding_system',
        label: 'Sistema de Aterramento',
        type: 'select',
        required: true,
        options: ['TN-S', 'TN-C', 'TT', 'IT', 'Outro']
      }
    ],
    photos: [
      {
        name: 'cabin_external',
        label: 'Vista Externa da Cabine',
        required: true,
        maxPhotos: 2
      },
      {
        name: 'cabin_internal',
        label: 'Vista Interna da Cabine',
        required: true,
        maxPhotos: 2
      },
      {
        name: 'nameplate',
        label: 'Placa de Identificação',
        required: true,
        maxPhotos: 1
      },
      {
        name: 'grounding_system',
        label: 'Sistema de Aterramento',
        required: true,
        maxPhotos: 1
      }
    ]
  },

  'procedures': {
    id: 'procedures',
    title: 'Procedimentos',
    description: 'Checklist completo de segurança e procedimentos operacionais',
    order: 3,
    required: true,
    icon: 'Tool',
    fields: [
      {
        name: 'safety_equipment',
        label: 'Equipamentos de Segurança Individual',
        type: 'boolean',
        required: true
      },
      {
        name: 'area_isolation',
        label: 'Isolamento da Área de Trabalho',
        type: 'boolean',
        required: true
      },
      {
        name: 'voltage_verification',
        label: 'Verificação de Ausência de Tensão',
        type: 'boolean',
        required: true
      },
      {
        name: 'grounding_installation',
        label: 'Instalação de Aterramento Temporário',
        type: 'boolean',
        required: true
      },
      {
        name: 'signaling_protection',
        label: 'Sinalização e Proteção do Local',
        type: 'boolean',
        required: true
      }
    ],
    photos: [
      {
        name: 'safety_procedures',
        label: 'Procedimentos de Segurança',
        required: true,
        maxPhotos: 3
      }
    ]
  },

  'maintenance': {
    id: 'maintenance',
    title: 'Manutenção',
    description: 'Histórico detalhado, frequência e planejamento de manutenções',
    order: 4,
    required: true,
    icon: 'Battery',
    fields: [
      {
        name: 'last_maintenance',
        label: 'Data da Última Manutenção',
        type: 'date',
        required: true
      },
      {
        name: 'maintenance_frequency',
        label: 'Frequência de Manutenção',
        type: 'select',
        required: true,
        options: ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Outro']
      },
      {
        name: 'maintenance_type',
        label: 'Tipo de Manutenção',
        type: 'select',
        required: true,
        options: ['Preventiva', 'Corretiva', 'Preditiva', 'Emergencial', 'Outro']
      },
      {
        name: 'maintenance_company',
        label: 'Empresa Responsável',
        type: 'text',
        required: true,
        placeholder: 'Nome da empresa de manutenção'
      },
      {
        name: 'maintenance_area',
        label: 'Área de Manutenção',
        type: 'text',
        placeholder: 'Ex: MANUTENÇÃO CABINE PRIMÁRIA'
      },
      {
        name: 'maintenance_observations',
        label: 'Observações da Manutenção',
        type: 'textarea',
        placeholder: 'Observações específicas sobre o escopo da manutenção'
      },
      {
        name: 'next_maintenance',
        label: 'Próxima Manutenção Programada',
        type: 'date'
      }
    ],
    photos: [
      {
        name: 'maintenance_records',
        label: 'Registros de Manutenção',
        required: false,
        maxPhotos: 2
      }
    ]
  },

  'transformers': {
    id: 'transformers',
    title: 'Transformadores',
    description: 'Dados técnicos completos, ensaios elétricos e medições',
    order: 5,
    required: true,
    icon: 'Cable',
    fields: [
      {
        name: 'manufacturer',
        label: 'Fabricante',
        type: 'text',
        required: true,
        placeholder: 'Ex: WEG, ABB, Schneider'
      },
      {
        name: 'serial_number',
        label: 'Número de Série',
        type: 'text',
        required: true
      },
      {
        name: 'power_kva',
        label: 'Potência',
        type: 'number',
        unit: 'kVA',
        required: true,
        validation: { min: 1, max: 10000 }
      },
      {
        name: 'primary_voltage',
        label: 'Tensão Primária',
        type: 'number',
        unit: 'V',
        required: true,
        validation: { min: 1000, max: 50000 }
      },
      {
        name: 'secondary_voltage',
        label: 'Tensão Secundária',
        type: 'number',
        unit: 'V',
        required: true,
        validation: { min: 100, max: 1000 }
      },
      {
        name: 'installation_year',
        label: 'Ano de Instalação',
        type: 'number',
        required: true,
        validation: { min: 1950, max: 2030 }
      },
      {
        name: 'oil_volume_liters',
        label: 'Volume de Óleo',
        type: 'number',
        unit: 'L',
        validation: { min: 0, max: 10000 }
      },
      {
        name: 'weight_kg',
        label: 'Peso',
        type: 'number',
        unit: 'kg',
        validation: { min: 0, max: 50000 }
      },
      {
        name: 'oil_leakage',
        label: 'Vazamento de Óleo',
        type: 'boolean'
      },
      {
        name: 'tap_positions',
        label: 'Número de Posições do Tap',
        type: 'number',
        validation: { min: 3, max: 17 }
      },
      {
        name: 'tap_current_position',
        label: 'Posição Atual do Tap',
        type: 'number',
        validation: { min: 1, max: 17 }
      },
      {
        name: 'tap_range_percent',
        label: 'Faixa de Regulação do Tap',
        type: 'number',
        unit: '%',
        validation: { min: 0, max: 20 }
      }
    ],
    photos: [
      {
        name: 'proximidade',
        label: 'FOTO 2 - Proximidade/Trafo',
        description: 'Vista próxima do transformador e equipamentos',
        required: true,
        maxPhotos: 1
      },
      {
        name: 'transformer_nameplate',
        label: 'Placa do Transformador',
        required: true,
        maxPhotos: 1
      },
      {
        name: 'transformer_general',
        label: 'Vista Geral do Transformador',
        required: true,
        maxPhotos: 2
      }
    ],
    measurements: [
      {
        name: 'insulation_primary',
        label: 'Isolamento Primário',
        unit: 'MΩ',
        type: 'resistance',
        range: { min: 0, max: 10000 },
        required: true
      },
      {
        name: 'insulation_secondary',
        label: 'Isolamento Secundário',
        unit: 'MΩ',
        type: 'resistance',
        range: { min: 0, max: 10000 },
        required: true
      },
      {
        name: 'temperature',
        label: 'Temperatura do Óleo',
        unit: '°C',
        type: 'temperature',
        range: { min: -10, max: 120 }
      },
      {
        name: 'oil_level_percent',
        label: 'Nível de Óleo',
        unit: '%',
        type: 'other',
        range: { min: 0, max: 100 }
      }
    ]
  },

  'grid_connection': {
    id: 'grid_connection',
    title: 'Conexão Concessionária',
    description: 'Interface com rede, medidores e tarifação',
    order: 6,
    required: true,
    icon: 'Bolt',
    fields: [
      {
        name: 'concessionaria',
        label: 'Concessionária',
        type: 'select',
        required: true,
        options: ['CPFL', 'Enel', 'EDP', 'Elektro', 'Eletropaulo', 'Outro']
      },
      {
        name: 'concessionaire_consumer_code',
        label: 'Código do Consumidor',
        type: 'text',
        required: true,
        placeholder: 'Ex: MTE 1000245'
      },
      {
        name: 'contracted_demand_kw',
        label: 'Demanda Contratada',
        type: 'number',
        unit: 'kW',
        required: true,
        validation: { min: 1, max: 50000 },
        placeholder: 'Ex: 50'
      },
      {
        name: 'concessionaire_name',
        label: 'Nome da Concessionária',
        type: 'text',
        placeholder: 'Ex: CPFL'
      },
      {
        name: 'concessionaire_consumer_code',
        label: 'Código do Consumidor (Legado)',
        type: 'text',
        placeholder: 'Código de identificação na concessionária (campo legado)'
      },
      {
        name: 'demanda_kw',
        label: 'Demanda Contratada (Legado)',
        type: 'number',
        unit: 'kW',
        validation: { min: 1, max: 50000 },
        placeholder: 'Campo legado - use contracted_demand_kw'
      },
      {
        name: 'tariff_type',
        label: 'Tipo de Tarifa',
        type: 'select',
        required: true,
        options: ['Convencional', 'Horo-sazonal Azul', 'Horo-sazonal Verde', 'Outro']
      },
      {
        name: 'meter_number',
        label: 'Número do Medidor',
        type: 'text',
        placeholder: 'Número de série do medidor'
      }
    ],
    photos: [
      {
        name: 'connection_point',
        label: 'Ponto de Conexão',
        required: true,
        maxPhotos: 2
      },
      {
        name: 'meter',
        label: 'Medidor',
        required: true,
        maxPhotos: 1
      }
    ]
  },

  'mt': {
    id: 'mt',
    title: 'Média Tensão (MT)',
    description: 'Sistema de distribuição MT com medições trifásicas',
    order: 7,
    required: true,
    icon: 'Lightbulb',
    fields: [
      {
        name: 'mt_voltage_level',
        label: 'Tensão de Operação MT',
        type: 'select',
        required: true,
        options: ['13.8 kV', '23 kV', '34.5 kV', 'Outro']
      },
      {
        name: 'protection_type',
        label: 'Tipo de Proteção',
        type: 'select',
        required: true,
        options: ['Disjuntor', 'Fusível', 'Seccionador', 'Outro']
      },
      {
        name: 'switchgear_type',
        label: 'Tipo de Equipamento',
        type: 'select',
        required: true,
        options: ['Cubículo Metálico', 'Painel Aberto', 'Compacto', 'Outro']
      }
    ],
    photos: [
      {
        name: 'mt_panel',
        label: 'Painel MT',
        required: true,
        maxPhotos: 2
      },
      {
        name: 'mt_protection',
        label: 'Proteção MT',
        required: true,
        maxPhotos: 1
      }
    ],
    measurements: [
      {
        name: 'voltage_r',
        label: 'Tensão Fase R',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 50000 }
      },
      {
        name: 'voltage_s',
        label: 'Tensão Fase S',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 50000 }
      },
      {
        name: 'voltage_t',
        label: 'Tensão Fase T',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 50000 }
      }
    ]
  },

  'bt': {
    id: 'bt',
    title: 'Baixa Tensão (BT)',
    description: 'Sistema de distribuição BT com medições completas',
    order: 8,
    required: true,
    icon: 'HardHat',
    fields: [
      {
        name: 'bt_voltage_level',
        label: 'Tensão de Operação BT',
        type: 'select',
        required: true,
        options: ['220V', '380V', '440V', 'Outro']
      },
      {
        name: 'distribution_type',
        label: 'Tipo de Distribuição',
        type: 'select',
        required: true,
        options: ['Radial', 'Anel', 'Dupla Alimentação', 'Outro']
      },
      {
        name: 'main_breaker',
        label: 'Disjuntor Geral BT',
        type: 'text',
        required: true,
        placeholder: 'Ex: MTE 1000245'
      },
      {
        name: 'contracted_demand_kw',
        label: 'Demanda Contratada',
        type: 'number',
        unit: 'kW',
        required: true,
        validation: { min: 1, max: 50000 },
        placeholder: 'Ex: 50'
      },
      {
        name: 'concessionaire_name',
        label: 'Nome da Concessionária',
        type: 'text',
        placeholder: 'Ex: CPFL'
      },
      {
        name: 'codigo_consumidor',
        label: 'Código do Consumidor (Legado)',
        type: 'text',
        placeholder: 'Código de identificação na concessionária (campo legado)'
      }
    ],
    photos: [
      {
        name: 'quadro_geral',
        label: 'FOTO 4 - Quadro Geral',
        description: 'Vista geral do quadro elétrico principal',
        required: true,
        maxPhotos: 1
      },
      {
        name: 'bt_distribution',
        label: 'Distribuição BT',
        required: true,
        maxPhotos: 2
      }
    ],
    measurements: [
      {
        name: 'voltage_l1',
        label: 'Tensão L1-N',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 1000 }
      },
      {
        name: 'voltage_l2',
        label: 'Tensão L2-N',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 1000 }
      },
      {
        name: 'voltage_l3',
        label: 'Tensão L3-N',
        unit: 'V',
        type: 'voltage',
        range: { min: 0, max: 1000 }
      },
      {
        name: 'current_l1',
        label: 'Corrente L1',
        unit: 'A',
        type: 'current',
        range: { min: 0, max: 5000 }
      },
      {
        name: 'current_l2',
        label: 'Corrente L2',
        unit: 'A',
        type: 'current',
        range: { min: 0, max: 5000 }
      },
      {
        name: 'current_l3',
        label: 'Corrente L3',
        unit: 'A',
        type: 'current',
        range: { min: 0, max: 5000 }
      }
    ]
  },

  'epcs': {
    id: 'epcs',
    title: 'EPCs',
    description: 'Equipamentos de proteção coletiva e sistemas de segurança',
    order: 9,
    required: true,
    icon: 'ClipboardCheck',
    fields: [
      {
        name: 'fire_extinguisher',
        label: 'Extintor de Incêndio',
        type: 'boolean'
      },
      {
        name: 'first_aid_kit',
        label: 'Kit de Primeiros Socorros',
        type: 'boolean'
      },
      {
        name: 'safety_shower',
        label: 'Chuveiro de Emergência',
        type: 'boolean'
      },
      {
        name: 'eye_wash',
        label: 'Lava-olhos',
        type: 'boolean'
      },
      {
        name: 'emergency_lighting',
        label: 'Iluminação de Emergência',
        type: 'boolean'
      },
      {
        name: 'ventilation_system',
        label: 'Sistema de Ventilação',
        type: 'boolean'
      },
      {
        name: 'grounding_rods',
        label: 'Hastes de Aterramento',
        type: 'boolean'
      },
      {
        name: 'safety_barriers',
        label: 'Barreiras de Segurança',
        type: 'boolean'
      }
    ],
    photos: [
      {
        name: 'epcs_general',
        label: 'EPCs - Vista Geral',
        required: true,
        maxPhotos: 3
      }
    ]
  },

  'general_state': {
    id: 'general_state',
    title: 'Estado Geral',
    description: 'Avaliação final, conformidade e recomendações',
    order: 10,
    required: true,
    icon: 'Power',
    fields: [
      {
        name: 'overall_condition',
        label: 'Condição Geral da Instalação',
        type: 'select',
        required: true,
        options: ['Excelente', 'Boa', 'Regular', 'Ruim', 'Crítica']
      },
      {
        name: 'compliance_status',
        label: 'Status de Conformidade',
        type: 'select',
        required: true,
        options: ['Conforme', 'Não Conforme', 'Conforme com Restrições']
      },
      {
        name: 'critical_issues',
        label: 'Problemas Críticos Identificados',
        type: 'textarea',
        placeholder: 'Descreva problemas que requerem atenção imediata'
      },
      {
        name: 'recommendations',
        label: 'Recomendações Técnicas',
        type: 'textarea',
        placeholder: 'Recomendações para melhorias e manutenções'
      },
      {
        name: 'priority_actions',
        label: 'Ações Prioritárias',
        type: 'textarea',
        placeholder: 'Ações que devem ser executadas prioritariamente'
      },
      {
        name: 'conclusion',
        label: 'Conclusão da Inspeção',
        type: 'textarea',
        required: true,
        placeholder: 'Conclusão final da inspeção técnica'
      }
    ],
    photos: [
      {
        name: 'general_overview',
        label: 'Vista Geral Final',
        required: true,
        maxPhotos: 2
      }
    ]
  },

  'reconnection': {
    id: 'reconnection',
    title: 'Religamento',
    description: 'Procedimentos de religamento e testes finais',
    order: 11,
    required: true,
    icon: 'AlertTriangle',
    fields: [
      {
        name: 'reconnection_authorized',
        label: 'Religamento Autorizado',
        type: 'boolean',
        required: true
      },
      {
        name: 'final_tests',
        label: 'Testes Finais Realizados',
        type: 'boolean',
        required: true
      },
      {
        name: 'system_operational',
        label: 'Sistema Operacional',
        type: 'boolean',
        required: true
      },
      {
        name: 'reconnection_time',
        label: 'Horário do Religamento',
        type: 'time'
      },
      {
        name: 'final_observations',
        label: 'Observações Finais',
        type: 'textarea',
        placeholder: 'Observações sobre o religamento e estado final'
      }
    ],
    photos: [
      {
        name: 'reconnection_procedure',
        label: 'Procedimento de Religamento',
        required: false,
        maxPhotos: 2
      }
    ]
  },

  'component_irregularities': {
    id: 'component_irregularities',
    title: 'Irregularidades',
    description: 'Componentes com problemas identificados (opcional)',
    order: 12,
    required: false,
    icon: 'AlertTriangle',
    fields: [
      {
        name: 'has_irregularities',
        label: 'Foram identificadas irregularidades?',
        type: 'boolean'
      },
      {
        name: 'component_type',
        label: 'Tipo de Componente',
        type: 'select',
        options: ['Transformador', 'Disjuntor MT', 'Disjuntor BT', 'Proteção', 'Medição', 'Aterramento', 'Estrutura', 'Outro'],
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'location_description',
        label: 'Localização do Problema',
        type: 'text',
        placeholder: 'Descreva onde está localizado o problema',
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'irregularity_description',
        label: 'Descrição da Irregularidade',
        type: 'textarea',
        placeholder: 'Descreva detalhadamente o problema encontrado',
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'severity',
        label: 'Severidade',
        type: 'select',
        options: ['Baixa', 'Média', 'Alta', 'Crítica'],
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'safety_risk',
        label: 'Risco de Segurança',
        type: 'select',
        options: ['Baixo', 'Médio', 'Alto', 'Crítico'],
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'recommended_action',
        label: 'Ação Recomendada',
        type: 'textarea',
        placeholder: 'Descreva a ação corretiva recomendada',
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'priority',
        label: 'Prioridade de Correção',
        type: 'select',
        options: ['Imediata', 'Urgente', 'Programada', 'Futura'],
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'estimated_cost',
        label: 'Custo Estimado',
        type: 'text',
        placeholder: 'Estimativa de custo para correção',
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'responsible_party',
        label: 'Responsável pela Correção',
        type: 'select',
        options: ['Cliente', 'Concessionária', 'Empresa de Manutenção', 'A definir'],
        conditionalOn: { field: 'has_irregularities', value: true }
      },
      {
        name: 'regulatory_reference',
        label: 'Referência Normativa',
        type: 'text',
        placeholder: 'NBR, NR ou norma técnica aplicável',
        conditionalOn: { field: 'has_irregularities', value: true }
      }
    ],
    photos: [
      {
        name: 'irregularity_evidence',
        label: 'Evidência da Irregularidade',
        required: false,
        maxPhotos: 4
      }
    ]
  }
};

export type CabinType = typeof CABIN_TYPES[number]['key'];
export type ModuleType = keyof typeof MODULE_CONFIGURATIONS;
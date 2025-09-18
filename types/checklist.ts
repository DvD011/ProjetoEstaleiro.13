export interface ChecklistItem {
  id: string;
  acao_curta: string;
  como_testar: string;
  valor_esperado?: string;
  unidade?: string;
  tolerance_percent?: number;
  metodo_medicao?: string;
  campo_observacao: string;
  foto_required: boolean;
  linked_ui_field?: string;
  equipment_type?: string;
  criticidade: 'baixa' | 'media' | 'alta';
  categoria: 'visual' | 'medicao' | 'operacional' | 'seguranca';
  frequencia_dias: number;
  needs_review?: boolean;
  default_applied?: boolean;
}

export interface CorrectiveAction {
  fault_id: string;
  linked_checklist_id: string;
  descricao: string;
  criticidade: 'baixa' | 'media' | 'alta';
  acao_tomada: 'temporaria' | 'permanente';
  materiais_usados: string[];
  custo_estimado: number;
  fotos_before: string[];
  fotos_after: string[];
  data_deteccao: string;
  data_correcao?: string;
  responsavel: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  os_gerada?: string;
  observacoes?: string;
}

export interface ChecklistTemplate {
  cabin_type: string;
  equipment_category: string;
  items: ChecklistItem[];
  triggers: {
    auto_os_generation: boolean;
    notification_rules: string[];
    cost_tracking: boolean;
  };
}

// Checklist preventivo decomposto por tipo de cabine
export const PREVENTIVE_CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  'CONVENCIONAL': {
    cabin_type: 'CONVENCIONAL',
    equipment_category: 'MT_BT_COMPLETA',
    items: [
      // INSPEÇÃO VISUAL EXTERNA
      {
        id: 'vis_ext_001',
        acao_curta: 'Verificar estado da estrutura externa',
        como_testar: 'Inspeção visual da cabine, portas, ventilação',
        campo_observacao: 'Anotar danos, corrosão, deformações',
        foto_required: true,
        linked_ui_field: 'cabin_external_condition',
        criticidade: 'media',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'vis_ext_002',
        acao_curta: 'Verificar fechaduras e travas',
        como_testar: 'Testar abertura/fechamento de portas',
        campo_observacao: 'Estado das fechaduras, chaves, travas',
        foto_required: false,
        linked_ui_field: 'door_locks_condition',
        criticidade: 'baixa',
        categoria: 'operacional',
        frequencia_dias: 90
      },
      {
        id: 'vis_ext_003',
        acao_curta: 'Verificar sinalização de segurança',
        como_testar: 'Conferir placas, avisos, identificações',
        campo_observacao: 'Legibilidade e integridade das placas',
        foto_required: true,
        linked_ui_field: 'safety_signage_condition',
        criticidade: 'alta',
        categoria: 'seguranca',
        frequencia_dias: 90
      },

      // TRANSFORMADOR
      {
        id: 'trf_001',
        acao_curta: 'Verificar nível de óleo',
        como_testar: 'Leitura visual do indicador de nível',
        valor_esperado: '75-100',
        unidade: '%',
        tolerance_percent: 10,
        metodo_medicao: 'Visual - indicador de nível',
        campo_observacao: 'Nível atual e cor do óleo',
        foto_required: true,
        linked_ui_field: 'oil_level_percent',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },
      {
        id: 'trf_002',
        acao_curta: 'Verificar vazamentos de óleo',
        como_testar: 'Inspeção visual de toda a superfície',
        campo_observacao: 'Localização e intensidade de vazamentos',
        foto_required: true,
        linked_ui_field: 'oil_leakage',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },
      {
        id: 'trf_003',
        acao_curta: 'Medir temperatura do óleo',
        como_testar: 'Termômetro infravermelho no tanque',
        valor_esperado: '65',
        unidade: '°C',
        tolerance_percent: 15,
        metodo_medicao: 'Termômetro infravermelho',
        campo_observacao: 'Temperatura ambiente e carga',
        foto_required: false,
        linked_ui_field: 'oil_temperature',
        equipment_type: 'transformador',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 30
      },
      {
        id: 'trf_004',
        acao_curta: 'Verificar fixação do transformador',
        como_testar: 'Inspeção visual e teste manual de parafusos',
        campo_observacao: 'Estado dos parafusos e suportes',
        foto_required: false,
        linked_ui_field: 'transformer_mounting',
        equipment_type: 'transformador',
        criticidade: 'media',
        categoria: 'operacional',
        frequencia_dias: 90
      },
      {
        id: 'trf_005',
        acao_curta: 'Verificar isoladores de bucha',
        como_testar: 'Inspeção visual de trincas, sujeira',
        campo_observacao: 'Estado dos isoladores MT e BT',
        foto_required: true,
        linked_ui_field: 'bushing_insulators',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },

      // MÉDIA TENSÃO
      {
        id: 'mt_001',
        acao_curta: 'Verificar estado do disjuntor MT',
        como_testar: 'Inspeção visual e teste de operação',
        campo_observacao: 'Funcionamento, ruídos, aquecimento',
        foto_required: true,
        linked_ui_field: 'mt_breaker_condition',
        equipment_type: 'disjuntor_mt',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 90
      },
      {
        id: 'mt_002',
        acao_curta: 'Verificar conexões MT',
        como_testar: 'Inspeção visual de bornes e cabos',
        campo_observacao: 'Oxidação, aquecimento, folgas',
        foto_required: true,
        linked_ui_field: 'mt_connections',
        equipment_type: 'conexoes_mt',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'mt_003',
        acao_curta: 'Medir tensão MT fase R',
        como_testar: 'Multímetro ou voltímetro MT',
        valor_esperado: '13800',
        unidade: 'V',
        tolerance_percent: 5,
        metodo_medicao: 'Voltímetro MT - Fase R-Terra',
        campo_observacao: 'Condições de medição e carga',
        foto_required: false,
        linked_ui_field: 'voltage_r',
        equipment_type: 'medicao_mt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'mt_004',
        acao_curta: 'Medir tensão MT fase S',
        como_testar: 'Multímetro ou voltímetro MT',
        valor_esperado: '13800',
        unidade: 'V',
        tolerance_percent: 5,
        metodo_medicao: 'Voltímetro MT - Fase S-Terra',
        campo_observacao: 'Condições de medição e carga',
        foto_required: false,
        linked_ui_field: 'voltage_s',
        equipment_type: 'medicao_mt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'mt_005',
        acao_curta: 'Medir tensão MT fase T',
        como_testar: 'Multímetro ou voltímetro MT',
        valor_esperado: '13800',
        unidade: 'V',
        tolerance_percent: 5,
        metodo_medicao: 'Voltímetro MT - Fase T-Terra',
        campo_observacao: 'Condições de medição e carga',
        foto_required: false,
        linked_ui_field: 'voltage_t',
        equipment_type: 'medicao_mt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },

      // BAIXA TENSÃO
      {
        id: 'bt_001',
        acao_curta: 'Verificar estado do quadro BT',
        como_testar: 'Inspeção visual interna e externa',
        campo_observacao: 'Limpeza, organização, identificação',
        foto_required: true,
        linked_ui_field: 'bt_panel_condition',
        equipment_type: 'quadro_bt',
        criticidade: 'media',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'bt_002',
        acao_curta: 'Verificar aperto de bornes BT',
        como_testar: 'Teste manual e visual de conexões',
        campo_observacao: 'Bornes soltos, oxidação, aquecimento',
        foto_required: false,
        linked_ui_field: 'bt_terminals_tightness',
        equipment_type: 'conexoes_bt',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 90
      },
      {
        id: 'bt_003',
        acao_curta: 'Medir tensão BT L1-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L1 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l1',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_004',
        acao_curta: 'Medir tensão BT L2-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L2 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l2',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_005',
        acao_curta: 'Medir tensão BT L3-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L3 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l3',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_006',
        acao_curta: 'Medir corrente BT L1',
        como_testar: 'Alicate amperímetro no cabo L1',
        valor_esperado: null,
        unidade: 'A',
        tolerance_percent: 20,
        metodo_medicao: 'Alicate amperímetro',
        campo_observacao: 'Carga conectada durante medição',
        foto_required: false,
        linked_ui_field: 'current_l1',
        equipment_type: 'medicao_bt',
        criticidade: 'baixa',
        categoria: 'medicao',
        frequencia_dias: 90,
        needs_review: true
      },
      {
        id: 'bt_007',
        acao_curta: 'Medir corrente BT L2',
        como_testar: 'Alicate amperímetro no cabo L2',
        valor_esperado: null,
        unidade: 'A',
        tolerance_percent: 20,
        metodo_medicao: 'Alicate amperímetro',
        campo_observacao: 'Carga conectada durante medição',
        foto_required: false,
        linked_ui_field: 'current_l2',
        equipment_type: 'medicao_bt',
        criticidade: 'baixa',
        categoria: 'medicao',
        frequencia_dias: 90,
        needs_review: true
      },
      {
        id: 'bt_008',
        acao_curta: 'Medir corrente BT L3',
        como_testar: 'Alicate amperímetro no cabo L3',
        valor_esperado: null,
        unidade: 'A',
        tolerance_percent: 20,
        metodo_medicao: 'Alicate amperímetro',
        campo_observacao: 'Carga conectada durante medição',
        foto_required: false,
        linked_ui_field: 'current_l3',
        equipment_type: 'medicao_bt',
        criticidade: 'baixa',
        categoria: 'medicao',
        frequencia_dias: 90,
        needs_review: true
      },

      // ATERRAMENTO
      {
        id: 'grd_001',
        acao_curta: 'Medir resistência de aterramento',
        como_testar: 'Terrômetro nas hastes principais',
        valor_esperado: '10',
        unidade: 'Ω',
        tolerance_percent: 50,
        metodo_medicao: 'Terrômetro - Método 3 pontos',
        campo_observacao: 'Condições do solo e umidade',
        foto_required: true,
        linked_ui_field: 'grounding_resistance',
        equipment_type: 'aterramento',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 180
      },
      {
        id: 'grd_002',
        acao_curta: 'Verificar conexões de aterramento',
        como_testar: 'Inspeção visual e teste de continuidade',
        campo_observacao: 'Estado das conexões, oxidação',
        foto_required: true,
        linked_ui_field: 'grounding_connections',
        equipment_type: 'aterramento',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },

      // PROTEÇÃO
      {
        id: 'prt_001',
        acao_curta: 'Testar relé de proteção',
        como_testar: 'Simulação de falta ou teste funcional',
        campo_observacao: 'Tempo de atuação e precisão',
        foto_required: false,
        linked_ui_field: 'protection_relay_test',
        equipment_type: 'rele_protecao',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 180
      },
      {
        id: 'prt_002_vis',
        acao_curta: 'Verificar estado visual dos fusíveis MT',
        como_testar: 'Inspeção visual dos fusíveis MT',
        campo_observacao: 'Estado físico e especificação',
        foto_required: true,
        linked_ui_field: 'mt_fuses_visual_condition',
        equipment_type: 'fusivel_mt',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'prt_002_cont',
        acao_curta: 'Testar continuidade dos fusíveis MT',
        como_testar: 'Teste de continuidade com multímetro',
        valor_esperado: '0',
        unidade: 'Ω',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - Teste de continuidade',
        campo_observacao: 'Continuidade elétrica dos fusíveis',
        foto_required: false,
        linked_ui_field: 'mt_fuses_continuity_test',
        equipment_type: 'fusivel_mt',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 90
      },

      // LIMPEZA E MANUTENÇÃO
      {
        id: 'lmp_001',
        acao_curta: 'Limpar isoladores MT',
        como_testar: 'Limpeza com pano seco e inspeção',
        campo_observacao: 'Nível de sujeira antes/depois',
        foto_required: true,
        linked_ui_field: 'mt_insulators_cleaning',
        equipment_type: 'isoladores',
        criticidade: 'media',
        categoria: 'operacional',
        frequencia_dias: 90
      },
      {
        id: 'lmp_002',
        acao_curta: 'Limpar quadro BT interno',
        como_testar: 'Aspiração e limpeza com pano seco',
        campo_observacao: 'Acúmulo de poeira e detritos',
        foto_required: true,
        linked_ui_field: 'bt_panel_cleaning',
        equipment_type: 'quadro_bt',
        criticidade: 'media',
        categoria: 'operacional',
        frequencia_dias: 90
      },

      // TORQUE E FIXAÇÃO
      {
        id: 'trq_001',
        acao_curta: 'Verificar torque bornes MT',
        como_testar: 'Chave de torque conforme especificação',
        valor_esperado: '40',
        unidade: 'N.m',
        tolerance_percent: 10,
        metodo_medicao: 'Chave de torque calibrada',
        campo_observacao: 'Torque aplicado e condição dos bornes',
        foto_required: false,
        linked_ui_field: 'mt_terminals_torque',
        equipment_type: 'conexoes_mt',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 180
      },
      {
        id: 'trq_002',
        acao_curta: 'Verificar torque bornes BT',
        como_testar: 'Chave de torque conforme especificação',
        valor_esperado: '25',
        unidade: 'N.m',
        tolerance_percent: 15,
        metodo_medicao: 'Chave de torque calibrada',
        campo_observacao: 'Torque aplicado e condição dos bornes',
        foto_required: false,
        linked_ui_field: 'bt_terminals_torque',
        equipment_type: 'conexoes_bt',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 180
      },

      // ISOLAMENTO
      {
        id: 'iso_001',
        acao_curta: 'Medir isolamento primário',
        como_testar: 'Megôhmetro 1000V entre fases e terra',
        valor_esperado: '1000',
        unidade: 'MΩ',
        tolerance_percent: 50,
        metodo_medicao: 'Megôhmetro 1000V',
        campo_observacao: 'Condições ambientais durante teste',
        foto_required: false,
        linked_ui_field: 'insulation_primary',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 360
      },
      {
        id: 'iso_002',
        acao_curta: 'Medir isolamento secundário',
        como_testar: 'Megôhmetro 500V entre fases e terra',
        valor_esperado: '100',
        unidade: 'MΩ',
        tolerance_percent: 50,
        metodo_medicao: 'Megôhmetro 500V',
        campo_observacao: 'Condições ambientais durante teste',
        foto_required: false,
        linked_ui_field: 'insulation_secondary',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 360
      }
    ],
    triggers: {
      auto_os_generation: true,
      notification_rules: [
        'criticidade_alta_immediate',
        'measurement_out_of_range',
        'safety_issue_detected'
      ],
      cost_tracking: true
    }
  },

  'SIMPLIFICADA': {
    cabin_type: 'SIMPLIFICADA',
    equipment_category: 'BT_FUSIVEL',
    items: [
      // INSPEÇÃO VISUAL EXTERNA
      {
        id: 'vis_ext_001',
        acao_curta: 'Verificar estado da estrutura externa',
        como_testar: 'Inspeção visual da cabine, portas, ventilação',
        campo_observacao: 'Anotar danos, corrosão, deformações',
        foto_required: true,
        linked_ui_field: 'cabin_external_condition',
        criticidade: 'media',
        categoria: 'visual',
        frequencia_dias: 90
      },

      // TRANSFORMADOR
      {
        id: 'trf_001',
        acao_curta: 'Verificar nível de óleo',
        como_testar: 'Leitura visual do indicador de nível',
        valor_esperado: '75-100',
        unidade: '%',
        tolerance_percent: 10,
        metodo_medicao: 'Visual - indicador de nível',
        campo_observacao: 'Nível atual e cor do óleo',
        foto_required: true,
        linked_ui_field: 'oil_level_percent',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },
      {
        id: 'trf_002',
        acao_curta: 'Verificar vazamentos de óleo',
        como_testar: 'Inspeção visual de toda a superfície',
        campo_observacao: 'Localização e intensidade de vazamentos',
        foto_required: true,
        linked_ui_field: 'oil_leakage',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },

      // PROTEÇÃO POR FUSÍVEL
      {
        id: 'fus_001_vis',
        acao_curta: 'Verificar estado visual dos fusíveis MT',
        como_testar: 'Inspeção visual dos fusíveis MT',
        campo_observacao: 'Estado físico e especificação',
        foto_required: true,
        linked_ui_field: 'fuse_visual_condition',
        equipment_type: 'fusivel_mt',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'fus_001_cont',
        acao_curta: 'Testar continuidade dos fusíveis MT',
        como_testar: 'Teste de continuidade com multímetro',
        valor_esperado: '0',
        unidade: 'Ω',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - Teste de continuidade',
        campo_observacao: 'Continuidade elétrica dos fusíveis',
        foto_required: false,
        linked_ui_field: 'fuse_continuity_test',
        equipment_type: 'fusivel_mt',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'fus_002',
        acao_curta: 'Verificar base dos fusíveis',
        como_testar: 'Inspeção visual e teste de fixação',
        campo_observacao: 'Contatos, oxidação, fixação',
        foto_required: false,
        linked_ui_field: 'fuse_base_condition',
        equipment_type: 'fusivel_mt',
        criticidade: 'media',
        categoria: 'visual',
        frequencia_dias: 90
      },

      // BAIXA TENSÃO
      {
        id: 'bt_001',
        acao_curta: 'Verificar estado do quadro BT',
        como_testar: 'Inspeção visual interna e externa',
        campo_observacao: 'Limpeza, organização, identificação',
        foto_required: true,
        linked_ui_field: 'bt_panel_condition',
        equipment_type: 'quadro_bt',
        criticidade: 'media',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'bt_003',
        acao_curta: 'Medir tensão BT L1-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L1 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l1',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_004',
        acao_curta: 'Medir tensão BT L2-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L2 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l2',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_005',
        acao_curta: 'Medir tensão BT L3-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L3 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l3',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },

      // ATERRAMENTO
      {
        id: 'grd_001',
        acao_curta: 'Medir resistência de aterramento',
        como_testar: 'Terrômetro nas hastes principais',
        valor_esperado: '10',
        unidade: 'Ω',
        tolerance_percent: 50,
        metodo_medicao: 'Terrômetro - Método 3 pontos',
        campo_observacao: 'Condições do solo e umidade',
        foto_required: true,
        linked_ui_field: 'grounding_resistance',
        equipment_type: 'aterramento',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 180
      }
    ],
    triggers: {
      auto_os_generation: true,
      notification_rules: [
        'criticidade_alta_immediate',
        'measurement_out_of_range'
      ],
      cost_tracking: true
    }
  },

  'ESTALEIRO': {
    cabin_type: 'ESTALEIRO',
    equipment_category: 'POSTE_AEREO',
    items: [
      // ESTRUTURA AÉREA
      {
        id: 'est_001',
        acao_curta: 'Verificar estado do poste',
        como_testar: 'Inspeção visual da estrutura',
        campo_observacao: 'Rachaduras, inclinação, corrosão',
        foto_required: true,
        linked_ui_field: 'pole_condition',
        equipment_type: 'poste',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 90
      },
      {
        id: 'est_002',
        acao_curta: 'Verificar fixação do transformador',
        como_testar: 'Inspeção visual e teste de estabilidade',
        campo_observacao: 'Suportes, parafusos, estabilidade',
        foto_required: true,
        linked_ui_field: 'transformer_mounting',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'operacional',
        frequencia_dias: 90
      },

      // TRANSFORMADOR
      {
        id: 'trf_001',
        acao_curta: 'Verificar nível de óleo',
        como_testar: 'Leitura visual do indicador de nível',
        valor_esperado: '75-100',
        unidade: '%',
        tolerance_percent: 10,
        metodo_medicao: 'Visual - indicador de nível',
        campo_observacao: 'Nível atual e cor do óleo',
        foto_required: true,
        linked_ui_field: 'oil_level_percent',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },
      {
        id: 'trf_002',
        acao_curta: 'Verificar vazamentos de óleo',
        como_testar: 'Inspeção visual de toda a superfície',
        campo_observacao: 'Localização e intensidade de vazamentos',
        foto_required: true,
        linked_ui_field: 'oil_leakage',
        equipment_type: 'transformador',
        criticidade: 'alta',
        categoria: 'visual',
        frequencia_dias: 30
      },

      // BAIXA TENSÃO
      {
        id: 'bt_003',
        acao_curta: 'Medir tensão BT L1-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L1 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l1',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_004',
        acao_curta: 'Medir tensão BT L2-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L2 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l2',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },
      {
        id: 'bt_005',
        acao_curta: 'Medir tensão BT L3-N',
        como_testar: 'Multímetro nos bornes de saída',
        valor_esperado: '220',
        unidade: 'V',
        tolerance_percent: 10,
        metodo_medicao: 'Multímetro - L3 para Neutro',
        campo_observacao: 'Condições de carga durante medição',
        foto_required: false,
        linked_ui_field: 'voltage_l3',
        equipment_type: 'medicao_bt',
        criticidade: 'media',
        categoria: 'medicao',
        frequencia_dias: 90
      },

      // ATERRAMENTO
      {
        id: 'grd_001',
        acao_curta: 'Medir resistência de aterramento',
        como_testar: 'Terrômetro nas hastes principais',
        valor_esperado: '10',
        unidade: 'Ω',
        tolerance_percent: 50,
        metodo_medicao: 'Terrômetro - Método 3 pontos',
        campo_observacao: 'Condições do solo e umidade',
        foto_required: true,
        linked_ui_field: 'grounding_resistance',
        equipment_type: 'aterramento',
        criticidade: 'alta',
        categoria: 'medicao',
        frequencia_dias: 180
      }
    ],
    triggers: {
      auto_os_generation: true,
      notification_rules: [
        'criticidade_alta_immediate',
        'structural_safety_issue'
      ],
      cost_tracking: true
    }
  }
};

// Template para ações corretivas
export const CORRECTIVE_ACTION_TEMPLATE: Omit<CorrectiveAction, 'fault_id' | 'linked_checklist_id' | 'data_deteccao'> = {
  descricao: '',
  criticidade: 'media',
  acao_tomada: 'temporaria',
  materiais_usados: [],
  custo_estimado: 0,
  fotos_before: [],
  fotos_after: [],
  responsavel: '',
  status: 'pendente',
  observacoes: ''
};

// Regras de trigger para geração automática de OS
export const TRIGGER_RULES = {
  auto_os_generation: {
    conditions: [
      {
        field: 'criticidade',
        operator: 'equals',
        value: 'alta',
        action: 'generate_os_immediate'
      },
      {
        field: 'fotos_before',
        operator: 'not_empty',
        additional_condition: {
          field: 'criticidade',
          operator: 'in',
          value: ['media', 'alta']
        },
        action: 'generate_os_scheduled'
      }
    ]
  },
  notification_rules: {
    criticidade_alta_immediate: {
      trigger: 'criticidade === "alta"',
      recipients: ['supervisor', 'maintenance_team'],
      message_template: 'Problema crítico detectado: {descricao}',
      urgency: 'high'
    },
    measurement_out_of_range: {
      trigger: 'measurement_value outside tolerance',
      recipients: ['inspector', 'supervisor'],
      message_template: 'Medição fora da faixa: {item} = {value} (esperado: {expected})',
      urgency: 'medium'
    },
    safety_issue_detected: {
      trigger: 'categoria === "seguranca" && criticidade !== "baixa"',
      recipients: ['safety_officer', 'supervisor'],
      message_template: 'Problema de segurança: {descricao}',
      urgency: 'high'
    },
    structural_safety_issue: {
      trigger: 'equipment_type === "poste" && criticidade === "alta"',
      recipients: ['structural_engineer', 'supervisor'],
      message_template: 'Problema estrutural crítico: {descricao}',
      urgency: 'critical'
    }
  }
};

// Função para obter checklist baseado no tipo de cabine
export const getChecklistForCabinType = (cabinType: string): ChecklistTemplate | null => {
  return PREVENTIVE_CHECKLIST_TEMPLATES[cabinType] || null;
};

// Função para criar ação corretiva a partir de item do checklist
export const createCorrectiveAction = (
  checklistItemId: string,
  description: string,
  criticality: 'baixa' | 'media' | 'alta'
): CorrectiveAction => {
  const faultId = `fault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    fault_id: faultId,
    linked_checklist_id: checklistItemId,
    descricao: description,
    criticidade: criticality,
    acao_tomada: 'temporaria',
    materiais_usados: [],
    custo_estimado: 0,
    fotos_before: [],
    fotos_after: [],
    data_deteccao: new Date().toISOString(),
    responsavel: '',
    status: 'pendente'
  };
};

// Função para validar se uma medição está dentro da tolerância
export const validateMeasurement = (
  item: ChecklistItem,
  measuredValue: number
): { isValid: boolean; deviation: number; message: string } => {
  if (!item.valor_esperado || !item.tolerance_percent) {
    return { isValid: true, deviation: 0, message: 'Sem parâmetros de validação' };
  }

  const expectedValue = item.valor_esperado ? parseFloat(item.valor_esperado) : null;
  if (expectedValue === null || isNaN(expectedValue)) {
    return { isValid: true, deviation: 0, message: 'Valor esperado não definido' };
  }

  const tolerance = (expectedValue * item.tolerance_percent) / 100;
  const minValue = expectedValue - tolerance;
  const maxValue = expectedValue + tolerance;
  
  const isValid = measuredValue >= minValue && measuredValue <= maxValue;
  const deviation = Math.abs(((measuredValue - expectedValue) / expectedValue) * 100);

  return {
    isValid,
    deviation,
    message: isValid 
      ? 'Dentro da tolerância'
      : `Fora da faixa (${minValue.toFixed(2)} - ${maxValue.toFixed(2)} ${item.unidade})`
  };
};

// Função para determinar se deve gerar OS automaticamente
export const shouldGenerateOS = (correctiveAction: CorrectiveAction): boolean => {
  const rules = TRIGGER_RULES.auto_os_generation.conditions;
  
  return rules.some(rule => {
    switch (rule.field) {
      case 'criticidade':
        if (rule.operator === 'equals') {
          return correctiveAction.criticidade === rule.value;
        }
        break;
      case 'fotos_before':
        if (rule.operator === 'not_empty') {
          const hasPhotos = correctiveAction.fotos_before.length > 0;
          if (hasPhotos && rule.additional_condition) {
            const additionalCondition = rule.additional_condition;
            if (additionalCondition.field === 'criticidade' && additionalCondition.operator === 'in') {
              return (additionalCondition.value as string[]).includes(correctiveAction.criticidade);
            }
          }
          return hasPhotos;
        }
        break;
    }
    return false;
  });
};

// Função para determinar qual notificação enviar
export const getNotificationRule = (
  correctiveAction: CorrectiveAction,
  checklistItem?: ChecklistItem
): string | null => {
  // Problema estrutural crítico
  if (checklistItem?.equipment_type === 'poste' && correctiveAction.criticidade === 'alta') {
    return 'structural_safety_issue';
  }
  
  // Problema de segurança
  if (checklistItem?.categoria === 'seguranca' && correctiveAction.criticidade !== 'baixa') {
    return 'safety_issue_detected';
  }
  
  // Problema crítico geral
  if (correctiveAction.criticidade === 'alta') {
    return 'criticidade_alta_immediate';
  }
  
  return null;
};

// Template para webhook payload
export const createWebhookPayload = (
  correctiveAction: CorrectiveAction,
  notificationRule: string,
  inspectionId: string
) => {
  const ruleConfig = TRIGGER_RULES.notification_rules[notificationRule];
  
  if (!ruleConfig) return null;
  
  return {
    type: notificationRule,
    message: ruleConfig.message_template.replace('{descricao}', correctiveAction.descricao),
    recipients: ruleConfig.recipients,
    urgency: ruleConfig.urgency,
    inspection_id: inspectionId,
    fault_id: correctiveAction.fault_id,
    data: {
      criticality: correctiveAction.criticidade,
      action_type: correctiveAction.acao_tomada,
      estimated_cost: correctiveAction.custo_estimado,
      responsible: correctiveAction.responsavel,
      detection_date: correctiveAction.data_deteccao,
    },
  };
};
export interface ReportMetadata {
  titulo: string;
  subtitulo: string;
  data_emissao: string; // ISO-8601 format
  autor: string;
  logo_path?: string;
}

export interface ReportInitialData {
  cliente: string;
  nome_fantasia?: string;
  endereco: string;
  horario_chegada: string;
  responsavel_local: string;
  data_execucao: string;
  os_numero: string;
  concessionaria: string;
  demanda_kw: number;
  codigo_consumidor: string;
}

export interface ReportChecklist {
  secao: string;
  descricao: string;
  resultado: string | boolean;
  foto_ids: string[];
  video_url?: string;
}

export interface ReportEnsaio {
  tipo: string;
  parametros: Record<string, any>;
  valores: Record<string, any>;
  resultados_normativos: Record<string, any>;
}

export interface TransformerTap {
  posicao: number;
  tensao: number;
  percentual: number;
}

export interface TransformerEnsaio {
  tipo: string;
  valores: Record<string, number>;
  resultado: 'aprovado' | 'reprovado' | 'atencao';
}

export interface ReportTransformer {
  id: string;
  fabricante: string;
  oleo_litros: number;
  ano_fabricacao: number;
  serie: string;
  potencia_kva: number;
  peso_kg: number;
  taps: TransformerTap[];
  vazamento: boolean;
  fotos: string[];
  ensaios: TransformerEnsaio[];
}

export interface ReportComponent {
  tipo: string; // 'BT', 'MT', 'Proteção', etc.
  descricao: string;
  irregularidade: boolean;
  fotos: string[];
  videos: string[];
}

export interface ReportObject {
  metadados: ReportMetadata;
  dados_iniciais: ReportInitialData;
  checklists: ReportChecklist[];
  ensaios: ReportEnsaio[];
  transformadores: ReportTransformer[];
  componentes: ReportComponent[];
  conclusao: string;
  anexos: string[];
  maintenance_history?: MaintenanceHistory;
  report_mode?: 'compatibility' | 'enriched';
}

export interface MaintenanceHistory {
  last_maintenance_date?: string; // ISO-8601 format
  last_actions_summary?: string;
  historical_documents: HistoricalDocument[];
  maintenance_frequency?: string;
  maintenance_company?: string;
  next_maintenance_date?: string;
  no_history?: boolean; // Flag when no maintenance data is available
  free_form_observations?: string; // Free text when no structured data
}

export interface HistoricalDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  date_added: string;
  document_type: 'maintenance_record' | 'photo' | 'certificate' | 'report' | 'other';
}

export interface PDFGenerationOptions {
  template?: 'APP_DO_PATRÃO';
  mode?: 'compatibility' | 'enriched';
  style_options?: {
    font?: string;
    colors?: {
      primary?: string;
      table_header?: string;
    };
    margins_mm?: number;
  };
  output_path?: string;
}

export interface PDFGenerationResponse {
  success: boolean;
  pdf_url?: string;
  error?: string;
  validation_errors?: string[];
  critical_errors?: string[];
}
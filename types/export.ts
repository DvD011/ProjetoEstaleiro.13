export interface ExportLogEntry {
  id: string;
  inspection_id: string;
  user_id: string;
  report_type: 'PDF' | 'JSON';
  file_name: string;
  file_path?: string;
  version: number;
  exported_at: string;
  uploaded_at?: string;
  email_sent_at?: string;
  email_delivered_at?: string;
  recipient_emails: string[];
  status: 'pending' | 'uploaded' | 'sending_email' | 'success' | 'failed';
  error_message?: string;
  retry_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExportOptions {
  mode?: 'compatibility' | 'enriched';
  send_email?: boolean;
  recipient_emails?: string[];
  include_json?: boolean;
  template_type?: 'standard' | 'detailed';
}

export interface EmailTemplate {
  subject: string;
  html_body: string;
  text_body: string;
}

export interface ExportStatistics {
  total_exports: number;
  successful_exports: number;
  failed_exports: number;
  pending_exports: number;
  avg_generation_time_seconds: number;
  avg_upload_time_seconds: number;
  avg_email_time_seconds: number;
  success_rate_percentage: number;
}

export interface VersioningPolicy {
  strategy: 'increment' | 'timestamp' | 'uuid';
  preserve_all_versions: boolean;
  max_versions_per_inspection: number;
  auto_cleanup_after_days: number;
}

export interface StoragePolicy {
  bucket_name: string;
  path_template: string; // ex: "reports/{client_name}_{date}_v{version}.pdf"
  public_access: boolean;
  retention_days: number;
  max_file_size_mb: number;
  allowed_mime_types: string[];
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  mode: 'compatibility',
  send_email: false,
  recipient_emails: [],
  include_json: true,
  template_type: 'standard',
};

export const DEFAULT_VERSIONING_POLICY: VersioningPolicy = {
  strategy: 'increment',
  preserve_all_versions: true,
  max_versions_per_inspection: 50,
  auto_cleanup_after_days: 365,
};

export const DEFAULT_STORAGE_POLICY: StoragePolicy = {
  bucket_name: 'reports',
  path_template: 'reports/{client_name}_{date}_v{version}.{extension}',
  public_access: true,
  retention_days: 2555, // 7 anos para conformidade
  max_file_size_mb: 50,
  allowed_mime_types: ['application/pdf', 'application/json', 'image/jpeg', 'image/png'],
};

// Função para sanitizar nome do cliente para uso em arquivo
export const sanitizeClientName = (clientName: string): string => {
  return clientName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .substring(0, 50) // Limita tamanho
    .toLowerCase();
};

// Função para formatar data para nome de arquivo
export const formatDateForFileName = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  } catch {
    return new Date().toISOString().split('T')[0].replace(/-/g, '');
  }
};

// Função para construir nome do arquivo baseado no template
export const buildFileName = (
  template: string,
  clientName: string,
  date: string,
  version: number,
  extension: string
): string => {
  return template
    .replace('{client_name}', sanitizeClientName(clientName))
    .replace('{date}', formatDateForFileName(date))
    .replace('{version}', version.toString())
    .replace('{extension}', extension);
};

// Função para extrair número da versão de um nome de arquivo
export const extractVersionFromFileName = (fileName: string): number => {
  const match = fileName.match(/_v(\d+)\.(pdf|json)$/);
  return match ? parseInt(match[1]) : 0;
};

// Função para validar e-mail
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para obter destinatários padrão baseado nos dados da inspeção
export const getDefaultEmailRecipients = (moduleData: Record<string, any>): string[] => {
  const recipients: string[] = [];
  
  // Verificar se responsável local é um e-mail válido
  const responsavelLocal = moduleData.client?.responsavel_local;
  if (responsavelLocal && isValidEmail(responsavelLocal)) {
    recipients.push(responsavelLocal);
  }
  
  // Adicionar e-mail padrão da empresa
  recipients.push('contato@joule.com.br');
  
  return [...new Set(recipients)]; // Remove duplicatas
};
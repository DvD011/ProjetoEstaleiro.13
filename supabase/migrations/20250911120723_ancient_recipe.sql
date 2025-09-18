/*
  # Sistema de Exportação e Versionamento de Relatórios

  1. Nova Tabela
    - `export_logs` - Log completo de exportações, uploads e envios

  2. Funções Auxiliares
    - `get_next_version` - Determina próxima versão do relatório
    - `cleanup_old_export_logs` - Limpeza de logs antigos

  3. Segurança
    - RLS habilitado na tabela export_logs
    - Políticas para usuários autenticados e service_role

  4. Índices
    - Otimização para consultas de versionamento e histórico
*/

-- Tabela de logs de exportação
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('PDF', 'JSON')),
  file_name TEXT NOT NULL,
  file_path TEXT,
  version INTEGER NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_delivered_at TIMESTAMPTZ,
  recipient_emails TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'sending_email', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can read own export logs"
  ON export_logs
  FOR SELECT
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own export logs"
  ON export_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Service role can manage all export logs"
  ON export_logs
  FOR ALL
  TO service_role;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_export_logs_inspection_id ON export_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_status ON export_logs(status);
CREATE INDEX IF NOT EXISTS idx_export_logs_exported_at ON export_logs(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_version ON export_logs(inspection_id, report_type, version);
CREATE INDEX IF NOT EXISTS idx_export_logs_file_name ON export_logs(file_name);

-- Função para determinar próxima versão
CREATE OR REPLACE FUNCTION get_next_version(
  p_inspection_id TEXT,
  p_report_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM export_logs
  WHERE inspection_id = p_inspection_id
    AND report_type = p_report_type;
  
  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_export_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_export_logs_updated_at
  BEFORE UPDATE ON export_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_logs_updated_at();

-- Função para limpeza de logs antigos (manutenção)
CREATE OR REPLACE FUNCTION cleanup_old_export_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM export_logs 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas de exportação
CREATE OR REPLACE VIEW export_statistics AS
SELECT
  DATE_TRUNC('day', exported_at) as export_date,
  report_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (uploaded_at - exported_at))) as avg_upload_time_seconds,
  AVG(EXTRACT(EPOCH FROM (email_sent_at - uploaded_at))) as avg_email_time_seconds
FROM export_logs
WHERE exported_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', exported_at), report_type, status
ORDER BY export_date DESC;
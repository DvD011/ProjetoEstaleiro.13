/*
  # Sistema de Webhooks com Fila de Eventos

  1. Novas Tabelas
    - `webhook_queue` - Fila de eventos para processamento assíncrono
    - `webhook_logs` - Logs detalhados de requisições webhook

  2. Funções
    - `enqueue_webhook_event` - Adiciona eventos à fila
    - `trg_work_orders_after_insert` - Trigger para work orders
    - `trg_corrective_actions_after_ins_upd` - Trigger para ações corretivas

  3. Triggers
    - Enfileiramento automático de eventos
    - Integração com sistemas externos

  4. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para service_role
*/

-- Tabela de fila de webhooks
CREATE TABLE IF NOT EXISTS webhook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer DEFAULT 0,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_message text,
  next_retry_at timestamptz
);

-- Tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES webhook_queue(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  target_url text NOT NULL,
  request_payload jsonb,
  response_status integer,
  response_body text,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas service_role pode gerenciar)
CREATE POLICY "Service role can manage webhook queue"
  ON webhook_queue
  FOR ALL
  TO service_role;

CREATE POLICY "Service role can manage webhook logs"
  ON webhook_logs
  FOR ALL
  TO service_role;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority_created ON webhook_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_event_type ON webhook_queue(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_next_retry ON webhook_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_webhook_logs_queue_id ON webhook_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Função para enfileirar eventos webhook
CREATE OR REPLACE FUNCTION enqueue_webhook_event(
  p_event_type text,
  p_payload jsonb,
  p_priority integer DEFAULT 0
)
RETURNS uuid AS $$
DECLARE
  queue_id uuid;
BEGIN
  INSERT INTO webhook_queue (event_type, payload, priority)
  VALUES (p_event_type, p_payload, p_priority)
  RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Função trigger para work orders
CREATE OR REPLACE FUNCTION trg_work_orders_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Enfileirar evento para integração com WOMS/ERP
  PERFORM enqueue_webhook_event(
    'work_order_created',
    jsonb_build_object(
      'os_number', NEW.os_number,
      'inspection_id', NEW.inspection_id,
      'fault_id', NEW.fault_id,
      'description', NEW.description,
      'priority', NEW.priority,
      'estimated_cost', NEW.estimated_cost,
      'assigned_to', NEW.assigned_to,
      'created_at', NEW.created_at,
      'source', 'inspecao_eletrica_app'
    ),
    1 -- Prioridade alta para work orders
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função trigger para ações corretivas
CREATE OR REPLACE FUNCTION trg_corrective_actions_after_ins_upd()
RETURNS TRIGGER AS $$
DECLARE
  fotos_before_count integer := 0;
  fotos_after_count integer := 0;
BEGIN
  -- NOTA: Adapte os nomes das colunas conforme seu schema:
  -- Se usar 'criticidade' em vez de 'criticality', mantenha como está
  -- Se usar 'fotos_before' em vez de 'photos_before', mantenha como está
  -- Se usar 'custo_estimado' em vez de 'estimated_cost', mantenha como está
  
  -- Contar fotos before e after (assumindo que são arrays JSON)
  IF NEW.fotos_before IS NOT NULL THEN
    fotos_before_count := jsonb_array_length(NEW.fotos_before::jsonb);
  END IF;
  
  IF NEW.fotos_after IS NOT NULL THEN
    fotos_after_count := jsonb_array_length(NEW.fotos_after::jsonb);
  END IF;
  
  -- Evento para criticidade alta com fotos
  IF UPPER(NEW.criticidade) = 'ALTA' AND fotos_before_count > 0 THEN
    PERFORM enqueue_webhook_event(
      'corrective_action_high_criticality',
      jsonb_build_object(
        'fault_id', NEW.fault_id,
        'inspection_id', NEW.inspection_id,
        'descricao', NEW.descricao,
        'criticidade', NEW.criticidade,
        'custo_estimado', NEW.custo_estimado,
        'fotos_before_count', fotos_before_count,
        'fotos_after_count', fotos_after_count,
        'data_deteccao', NEW.data_deteccao,
        'responsavel', NEW.responsavel,
        'status', NEW.status,
        'event_trigger', 'high_criticality_with_photos'
      ),
      2 -- Prioridade muito alta para problemas críticos
    );
  END IF;
  
  -- Evento para mudança de custo (INSERT ou UPDATE)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.custo_estimado IS DISTINCT FROM NEW.custo_estimado) THEN
    PERFORM enqueue_webhook_event(
      'corrective_action_cost_changed',
      jsonb_build_object(
        'fault_id', NEW.fault_id,
        'inspection_id', NEW.inspection_id,
        'descricao', NEW.descricao,
        'criticidade', NEW.criticidade,
        'custo_estimado_anterior', CASE WHEN TG_OP = 'UPDATE' THEN OLD.custo_estimado ELSE NULL END,
        'custo_estimado_novo', NEW.custo_estimado,
        'data_deteccao', NEW.data_deteccao,
        'responsavel', NEW.responsavel,
        'status', NEW.status,
        'event_trigger', CASE WHEN TG_OP = 'INSERT' THEN 'cost_added' ELSE 'cost_updated' END
      ),
      0 -- Prioridade normal para tracking de custos
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers
CREATE TRIGGER trigger_work_orders_webhook
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_work_orders_after_insert();

CREATE TRIGGER trigger_corrective_actions_webhook
  AFTER INSERT OR UPDATE ON corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION trg_corrective_actions_after_ins_upd();

-- Função para limpar logs antigos (manutenção)
CREATE OR REPLACE FUNCTION cleanup_webhook_logs(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM webhook_logs 
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para reprocessar eventos falhados
CREATE OR REPLACE FUNCTION retry_failed_webhooks(max_attempts integer DEFAULT 3)
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE webhook_queue 
  SET 
    status = 'pending',
    next_retry_at = now() + (attempts * interval '5 minutes')
  WHERE status = 'failed' 
    AND attempts < max_attempts
    AND (next_retry_at IS NULL OR next_retry_at <= now());
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
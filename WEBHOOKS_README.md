# Sistema de Webhooks - Guia de Deploy e Configuração

## Visão Geral

Este sistema implementa uma arquitetura robusta de webhooks com fila de eventos para integração com sistemas externos (WOMS/ERP, notificações, tracking de custos).

## Arquitetura

```
Aplicação → Triggers DB → Fila de Webhooks → Edge Functions → Sistemas Externos
```

### Componentes:

1. **Fila de Webhooks** (`webhook_queue`) - Armazena eventos para processamento assíncrono
2. **Logs de Webhooks** (`webhook_logs`) - Registra todas as requisições e respostas
3. **Triggers de Banco** - Enfileiram eventos automaticamente
4. **Edge Functions** - Processam a fila e fazem integrações
5. **Cliente React Native** - Interface para monitoramento e testes

## 1. Configuração de Variáveis de Ambiente

### No Supabase Dashboard → Edge Functions → Environment Variables:

```bash
# Sistema WOMS/ERP (Ordens de Serviço)
EXTERNAL_WOMS_API_URL=https://api.woms-sistema.com/v1/work-orders
EXTERNAL_WOMS_API_KEY=sua_chave_woms_aqui

# Notificações Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX

# Notificações Microsoft Teams
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/xxxxx/IncomingWebhook/yyyy

# API de Notificação Customizada
CUSTOM_NOTIFICATION_API_URL=https://api.sua-empresa.com/notifications
NOTIFICATION_API_KEY=sua_chave_notificacao_aqui

# Sistema de Tracking de Custos
COST_TRACKING_API_URL=https://api.sistema-financeiro.com/v1/costs
COST_TRACKING_API_KEY=sua_chave_custos_aqui

# Configurações automáticas (já disponíveis)
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

## 2. Aplicar Migration

### Opção A: Via Supabase SQL Editor
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo `supabase/migrations/20250910_add_webhook_queue.sql`
4. Execute o SQL

### Opção B: Via Supabase CLI (se disponível)
```bash
# Aplicar migration
supabase db push

# Ou aplicar arquivo específico
supabase db reset --linked
```

## 3. Deploy das Edge Functions

### Via Supabase CLI:
```bash
# Deploy todas as functions
supabase functions deploy

# Ou deploy individual
supabase functions deploy process-webhook-queue
supabase functions deploy handle-new-os
supabase functions deploy send-notification
supabase functions deploy update-cost-tracking
supabase functions deploy webhook-config
```

### Via Dashboard:
1. Acesse Supabase Dashboard → Edge Functions
2. Crie nova function para cada arquivo
3. Cole o código TypeScript
4. Deploy

## 4. Configurar Processamento da Fila

### Opção A: Cron Job (Recomendado)
```bash
# Configurar cron job para processar fila a cada 2 minutos
*/2 * * * * curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/process-webhook-queue" \
  -H "Authorization: Bearer sua_service_role_key"
```

### Opção B: Trigger Manual
```bash
# Processar fila manualmente
curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/process-webhook-queue" \
  -H "Authorization: Bearer sua_service_role_key"
```

### Opção C: Via Aplicação
```typescript
// Chamar periodicamente no app (não recomendado para produção)
setInterval(async () => {
  await fetch(`${supabaseUrl}/functions/v1/process-webhook-queue`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${serviceRoleKey}` }
  });
}, 120000); // 2 minutos
```

## 5. Checklist de Testes

### Teste 1: Ação Corretiva de Alta Criticidade
```sql
-- Inserir ação corretiva crítica com fotos
INSERT INTO corrective_actions (
  fault_id, inspection_id, linked_checklist_id, descricao, criticidade,
  acao_tomada, custo_estimado, fotos_before, data_deteccao, responsavel, status
) VALUES (
  'test_fault_' || extract(epoch from now()),
  'test_inspection_123',
  'test_checklist_item',
  'Problema crítico de segurança detectado',
  'alta',
  'temporaria',
  2500.00,
  '["foto1.jpg", "foto2.jpg"]'::jsonb,
  now()::text,
  'João Silva',
  'pendente'
);

-- Verificar se evento foi enfileirado
SELECT * FROM webhook_queue WHERE event_type = 'corrective_action_high_criticality' ORDER BY created_at DESC LIMIT 1;
```

### Teste 2: Criação de Work Order
```sql
-- Inserir work order
INSERT INTO work_orders (
  os_number, inspection_id, fault_id, description, priority, estimated_cost, status
) VALUES (
  'TEST-OS-' || extract(epoch from now()),
  'test_inspection_123',
  'test_fault_456',
  'Ordem de serviço de teste',
  'urgent',
  1500.00,
  'pending'
);

-- Verificar se evento foi enfileirado
SELECT * FROM webhook_queue WHERE event_type = 'work_order_created' ORDER BY created_at DESC LIMIT 1;
```

### Teste 3: Alteração de Custo
```sql
-- Atualizar custo de ação corretiva existente
UPDATE corrective_actions 
SET custo_estimado = 3000.00 
WHERE fault_id = 'test_fault_456';

-- Verificar se evento foi enfileirado
SELECT * FROM webhook_queue WHERE event_type = 'corrective_action_cost_changed' ORDER BY created_at DESC LIMIT 1;
```

### Teste 4: Processar Fila
```bash
# Processar fila manualmente
curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/process-webhook-queue" \
  -H "Authorization: Bearer sua_service_role_key" \
  -H "Content-Type: application/json"
```

### Teste 5: Testar Webhooks Individuais
```bash
# Testar integração WOMS
curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/webhook-config" \
  -H "Authorization: Bearer sua_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"webhook_name": "external_os_integration"}'

# Testar notificações
curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/webhook-config" \
  -H "Authorization: Bearer sua_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"webhook_name": "notification_webhook"}'

# Testar tracking de custos
curl -X POST "https://sua-url-supabase.supabase.co/functions/v1/webhook-config" \
  -H "Authorization: Bearer sua_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"webhook_name": "cost_tracking_webhook"}'
```

## 6. Monitoramento

### Verificar Status da Fila:
```sql
-- Estatísticas da fila
SELECT status, COUNT(*) as count 
FROM webhook_queue 
GROUP BY status;

-- Itens falhados para retry
SELECT * FROM webhook_queue 
WHERE status = 'failed' 
AND attempts < 3 
ORDER BY created_at;
```

### Verificar Logs:
```sql
-- Logs recentes
SELECT event_type, response_status, error, created_at 
FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Taxa de sucesso por tipo de evento
SELECT 
  event_type,
  COUNT(*) as total,
  COUNT(CASE WHEN response_status BETWEEN 200 AND 299 THEN 1 END) as success,
  ROUND(
    COUNT(CASE WHEN response_status BETWEEN 200 AND 299 THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as success_rate
FROM webhook_logs 
GROUP BY event_type;
```

## 7. Manutenção

### Limpeza de Logs Antigos:
```sql
-- Limpar logs com mais de 30 dias
SELECT cleanup_webhook_logs(30);
```

### Reprocessar Eventos Falhados:
```sql
-- Reprocessar eventos falhados (máximo 3 tentativas)
SELECT retry_failed_webhooks(3);
```

## 8. Exemplos de Payloads

### Work Order Created:
```json
{
  "os_number": "OS-1704067200-A1B2",
  "inspection_id": "insp_123456",
  "fault_id": "fault_789",
  "description": "Substituição de isoladores danificados",
  "priority": "urgent",
  "estimated_cost": 2500.00,
  "assigned_to": "João Silva",
  "created_at": "2024-01-01T10:00:00Z"
}
```

### High Criticality Corrective Action:
```json
{
  "fault_id": "fault_789",
  "inspection_id": "insp_123456",
  "descricao": "Vazamento de óleo no transformador principal",
  "criticidade": "alta",
  "custo_estimado": 5000.00,
  "fotos_before_count": 3,
  "fotos_after_count": 0,
  "data_deteccao": "2024-01-01T10:00:00Z",
  "responsavel": "Maria Santos",
  "status": "pendente"
}
```

### Cost Changed:
```json
{
  "fault_id": "fault_789",
  "inspection_id": "insp_123456",
  "descricao": "Reparo de conexões MT",
  "criticidade": "media",
  "custo_estimado_anterior": 1000.00,
  "custo_estimado_novo": 1500.00,
  "event_trigger": "cost_updated",
  "data_deteccao": "2024-01-01T10:00:00Z",
  "responsavel": "Carlos Oliveira",
  "status": "em_andamento"
}
```

## 9. Troubleshooting

### Problemas Comuns:

1. **Eventos não são enfileirados**
   - Verificar se os triggers foram criados corretamente
   - Verificar se as colunas do schema estão corretas (criticidade, fotos_before, custo_estimado)

2. **Webhooks falham constantemente**
   - Verificar URLs e chaves de API nas variáveis de ambiente
   - Verificar logs em `webhook_logs` para detalhes do erro

3. **Fila não é processada**
   - Verificar se o cron job está configurado
   - Executar `process-webhook-queue` manualmente para teste

### Comandos de Debug:
```sql
-- Ver eventos na fila
SELECT * FROM webhook_queue ORDER BY created_at DESC LIMIT 10;

-- Ver logs de erro
SELECT * FROM webhook_logs WHERE error IS NOT NULL ORDER BY created_at DESC LIMIT 10;

-- Estatísticas gerais
SELECT 
  event_type,
  status,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts
FROM webhook_queue 
GROUP BY event_type, status;
```

## 10. Adaptações de Schema

Se seu schema usar nomes de colunas diferentes, ajuste nos triggers:

```sql
-- Se usar 'criticality' em vez de 'criticidade'
-- Substitua: NEW.criticidade → NEW.criticality

-- Se usar 'photos_before' em vez de 'fotos_before'  
-- Substitua: NEW.fotos_before → NEW.photos_before

-- Se usar 'estimated_cost' em vez de 'custo_estimado'
-- Substitua: NEW.custo_estimado → NEW.estimated_cost
```

## 11. Segurança

- Todas as tabelas têm RLS habilitado
- Apenas `service_role` pode gerenciar a fila e logs
- Chaves de API são armazenadas como variáveis de ambiente
- Logs não expõem dados sensíveis

## 12. Performance

- Índices otimizados para consultas da fila
- Processamento em lotes (BATCH_SIZE = 10)
- Retry automático com backoff exponencial
- Limpeza automática de logs antigos
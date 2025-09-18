@@ .. @@
 -- Function to auto-generate work orders for critical issues
 CREATE OR REPLACE FUNCTION auto_generate_work_order()
 RETURNS TRIGGER AS $$
 DECLARE
   os_number text;
 BEGIN
   -- Generate work order for high criticality issues with before photos
   IF NEW.criticidade = 'alta' AND 
      (NEW.fotos_before IS NOT NULL AND NEW.fotos_before != '[]') AND
      NEW.os_gerada IS NULL THEN
     
     -- Generate unique OS number
     os_number := 'OS-' || extract(epoch from now())::bigint || '-' || 
                  upper(substr(md5(random()::text), 1, 4));
     
     -- Insert work order
     INSERT INTO work_orders (
       os_number,
       inspection_id,
       fault_id,
       description,
       priority,
       estimated_cost,
       status,
       created_at
     ) VALUES (
       os_number,
       NEW.inspection_id,
       NEW.fault_id,
       NEW.descricao,
       'urgent',
       NEW.custo_estimado,
       'pending',
       CURRENT_TIMESTAMP
     );
     
     -- Update corrective action with OS number
     NEW.os_gerada := os_number;
+    
+    -- Log webhook trigger for external OS integration
+    INSERT INTO webhook_logs (
+      webhook_name,
+      event_type,
+      payload,
+      created_at
+    ) VALUES (
+      'external_os_integration',
+      'work_order_created',
+      jsonb_build_object(
+        'os_number', os_number,
+        'inspection_id', NEW.inspection_id,
+        'fault_id', NEW.fault_id,
+        'description', NEW.descricao,
+        'priority', 'urgent',
+        'estimated_cost', NEW.custo_estimado
+      ),
+      CURRENT_TIMESTAMP
+    );
   END IF;
   
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
 
+-- Webhook logs table for debugging and monitoring
+CREATE TABLE IF NOT EXISTS webhook_logs (
+  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
+  webhook_name text NOT NULL,
+  event_type text NOT NULL,
+  payload jsonb,
+  response jsonb,
+  success boolean DEFAULT false,
+  error_message text,
+  created_at timestamptz DEFAULT now(),
+  processed_at timestamptz
+);
+
+-- Enable RLS on webhook_logs
+ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
+
+-- Policy for webhook logs (service role only)
+CREATE POLICY "Service role can manage webhook logs"
+  ON webhook_logs
+  FOR ALL
+  TO service_role;
+
+-- Index for webhook logs
+CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_name ON webhook_logs(webhook_name);
+CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
+CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);
+
 -- Function to handle cost tracking webhook
 CREATE OR REPLACE FUNCTION notify_cost_tracking()
 RETURNS TRIGGER AS $$
 BEGIN
-  -- Call webhook for cost tracking integration
-  PERFORM net.http_post(
-    url := current_setting('app.supabase_url') || '/functions/v1/update-cost-tracking',
-    headers := jsonb_build_object(
-      'Content-Type', 'application/json',
-      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
-    ),
-    body := jsonb_build_object(
-      'type', TG_OP,
-      'table', 'corrective_actions',
-      'record', row_to_json(NEW),
-      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
-    )
+  -- Log webhook trigger for cost tracking
+  INSERT INTO webhook_logs (
+    webhook_name,
+    event_type,
+    payload,
+    created_at
+  ) VALUES (
+    'cost_tracking_webhook',
+    'corrective_action_' || lower(TG_OP),
+    jsonb_build_object(
+      'type', TG_OP,
+      'table', 'corrective_actions',
+      'record', row_to_json(NEW),
+      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
+    ),
+    CURRENT_TIMESTAMP
   );
   
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
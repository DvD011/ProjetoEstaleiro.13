@@ .. @@
 -- Function to auto-generate work orders for critical issues
 CREATE OR REPLACE FUNCTION auto_generate_work_order()
 RETURNS TRIGGER AS $$
+DECLARE
+  os_number text;
 BEGIN
   -- Generate work order for high criticality issues with before photos
   IF NEW.criticidade = 'alta' AND 
      (NEW.fotos_before IS NOT NULL AND NEW.fotos_before != '[]') AND
      NEW.os_gerada IS NULL THEN
     
-    DECLARE
-      os_number text;
-    BEGIN
-      -- Generate unique OS number
-      os_number := 'OS-' || extract(epoch from now())::bigint || '-' || 
-                   upper(substr(md5(random()::text), 1, 4));
-      
-      -- Insert work order
-      INSERT INTO work_orders (
-        os_number,
-        inspection_id,
-        fault_id,
-        description,
-        priority,
-        estimated_cost,
-        status,
-        created_at
-      ) VALUES (
-        os_number,
-        NEW.inspection_id,
-        NEW.fault_id,
-        NEW.descricao,
-        'urgent',
-        NEW.custo_estimado,
-        'pending',
-        CURRENT_TIMESTAMP
-      );
-      
-      -- Update corrective action with OS number
-      NEW.os_gerada := os_number;
-    END;
+    -- Generate unique OS number
+    os_number := 'OS-' || extract(epoch from now())::bigint || '-' || 
+                 upper(substr(md5(random()::text), 1, 4));
+    
+    -- Insert work order
+    INSERT INTO work_orders (
+      os_number,
+      inspection_id,
+      fault_id,
+      description,
+      priority,
+      estimated_cost,
+      status,
+      created_at
+    ) VALUES (
+      os_number,
+      NEW.inspection_id,
+      NEW.fault_id,
+      NEW.descricao,
+      'urgent',
+      NEW.custo_estimado,
+      'pending',
+      CURRENT_TIMESTAMP
+    );
+    
+    -- Update corrective action with OS number
+    NEW.os_gerada := os_number;
+    
+    -- Call webhook for external OS integration
+    PERFORM net.http_post(
+      url := current_setting('app.supabase_url') || '/functions/v1/handle-new-os',
+      headers := jsonb_build_object(
+        'Content-Type', 'application/json',
+        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
+      ),
+      body := jsonb_build_object(
+        'type', 'INSERT',
+        'table', 'work_orders',
+        'record', row_to_json(NEW)
+      )
+    );
   END IF;
   
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
+
+-- Function to handle cost tracking webhook
+CREATE OR REPLACE FUNCTION notify_cost_tracking()
+RETURNS TRIGGER AS $$
+BEGIN
+  -- Call webhook for cost tracking integration
+  PERFORM net.http_post(
+    url := current_setting('app.supabase_url') || '/functions/v1/update-cost-tracking',
+    headers := jsonb_build_object(
+      'Content-Type', 'application/json',
+      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
+    ),
+    body := jsonb_build_object(
+      'type', TG_OP,
+      'table', 'corrective_actions',
+      'record', row_to_json(NEW),
+      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
+    )
+  );
+  
+  RETURN NEW;
+END;
+$$ LANGUAGE plpgsql;
+
+-- Trigger for cost tracking webhook
+CREATE TRIGGER trigger_notify_cost_tracking
+  AFTER INSERT OR UPDATE ON corrective_actions
+  FOR EACH ROW
+  EXECUTE FUNCTION notify_cost_tracking();
/*
  # Preventive Checklist and Corrective Actions System

  1. New Tables
    - `checklist_executions` - Execution records for checklist items
    - `corrective_actions` - Corrective actions linked to failed checklist items
    - `work_orders` - Work orders generated from critical corrective actions

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Secure corrective action management

  3. Triggers
    - Auto-generate work orders for critical issues
    - Update inspection progress based on checklist completion
*/

-- Checklist executions table
CREATE TABLE IF NOT EXISTS checklist_executions (
  id text PRIMARY KEY,
  inspection_id text NOT NULL,
  checklist_item_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  measured_value real,
  observation text,
  photo_uris text DEFAULT '[]',
  executed_at text DEFAULT CURRENT_TIMESTAMP,
  executed_by text NOT NULL,
  validation_result text,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Corrective actions table
CREATE TABLE IF NOT EXISTS corrective_actions (
  fault_id text PRIMARY KEY,
  inspection_id text NOT NULL,
  linked_checklist_id text NOT NULL,
  descricao text NOT NULL,
  criticidade text NOT NULL DEFAULT 'media',
  acao_tomada text NOT NULL DEFAULT 'temporaria',
  materiais_usados text DEFAULT '[]',
  custo_estimado real DEFAULT 0,
  fotos_before text DEFAULT '[]',
  fotos_after text DEFAULT '[]',
  data_deteccao text NOT NULL,
  data_correcao text,
  responsavel text,
  status text NOT NULL DEFAULT 'pendente',
  os_gerada text,
  observacoes text,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  updated_at text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  os_number text PRIMARY KEY,
  inspection_id text NOT NULL,
  fault_id text,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  estimated_cost real DEFAULT 0,
  actual_cost real,
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  created_at text DEFAULT CURRENT_TIMESTAMP,
  scheduled_date text,
  completed_at text,
  notes text,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (fault_id) REFERENCES corrective_actions(fault_id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE checklist_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_executions
CREATE POLICY "Users can read own checklist executions"
  ON checklist_executions
  FOR SELECT
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own checklist executions"
  ON checklist_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own checklist executions"
  ON checklist_executions
  FOR UPDATE
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for corrective_actions
CREATE POLICY "Users can read own corrective actions"
  ON corrective_actions
  FOR SELECT
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own corrective actions"
  ON corrective_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own corrective actions"
  ON corrective_actions
  FOR UPDATE
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for work_orders
CREATE POLICY "Users can read own work orders"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all work orders"
  ON work_orders
  FOR ALL
  TO service_role;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_executions_inspection ON checklist_executions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_checklist_executions_item ON checklist_executions(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_executions_status ON checklist_executions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_inspection ON corrective_actions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_checklist ON corrective_actions(linked_checklist_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_criticidade ON corrective_actions(criticidade);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_inspection ON work_orders(inspection_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_fault ON work_orders(fault_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Function to auto-generate work orders for critical issues
CREATE OR REPLACE FUNCTION auto_generate_work_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate work order for high criticality issues with before photos
  IF NEW.criticidade = 'alta' AND 
     (NEW.fotos_before IS NOT NULL AND NEW.fotos_before != '[]') AND
     NEW.os_gerada IS NULL THEN
    
    DECLARE
      os_number text;
    BEGIN
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
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto work order generation
CREATE TRIGGER trigger_auto_generate_work_order
  BEFORE INSERT OR UPDATE ON corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_work_order();

-- Function to update inspection progress based on checklist completion
CREATE OR REPLACE FUNCTION update_inspection_checklist_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_items integer;
  completed_items integer;
  new_progress integer;
BEGIN
  -- Count total checklist items for this inspection's cabin type
  -- This would need to be calculated based on the cabin type
  -- For now, we'll use a simple count of executions
  
  SELECT COUNT(*) INTO completed_items
  FROM checklist_executions
  WHERE inspection_id = NEW.inspection_id
    AND status IN ('completed', 'failed');
  
  -- Estimate total items (this should be dynamic based on cabin type)
  total_items := GREATEST(completed_items, 20); -- Minimum assumption
  
  -- Calculate progress
  new_progress := LEAST(100, (completed_items * 100) / total_items);
  
  -- Update inspection progress
  UPDATE inspections 
  SET 
    progress = new_progress,
    status = CASE 
      WHEN new_progress >= 100 THEN 'completed'
      WHEN new_progress > 0 THEN 'in_progress'
      ELSE 'draft'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.inspection_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inspection progress update
CREATE TRIGGER trigger_update_inspection_checklist_progress
  AFTER INSERT OR UPDATE ON checklist_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_checklist_progress();
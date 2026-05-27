-- Add division to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS division text;

-- Approval flow configuration per division
CREATE TABLE IF NOT EXISTS leave_approval_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  division text NOT NULL,
  level int NOT NULL CHECK (level BETWEEN 1 AND 5),
  role_label text NOT NULL,
  approver_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, division, level)
);

-- Per-request approval tracking
CREATE TABLE IF NOT EXISTS leave_approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  level int NOT NULL,
  role_label text NOT NULL,
  approver_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected')),
  notes text,
  acted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(leave_request_id, level)
);

-- Trigger: auto-create steps when leave_request inserted
CREATE OR REPLACE FUNCTION fn_create_leave_approval_steps()
RETURNS TRIGGER AS $$
DECLARE
  v_division text;
  v_org_id uuid;
  flow_row RECORD;
BEGIN
  SELECT p.division, p.org_id INTO v_division, v_org_id
  FROM profiles p WHERE p.id = NEW.user_id;

  FOR flow_row IN
    SELECT * FROM leave_approval_flows
    WHERE org_id = v_org_id AND division = v_division AND is_active = true
    ORDER BY level
  LOOP
    INSERT INTO leave_approval_steps (
      leave_request_id, level, role_label, approver_user_id, status
    ) VALUES (
      NEW.id, flow_row.level, flow_row.role_label, flow_row.approver_user_id,
      CASE WHEN flow_row.level = 1 THEN 'pending' ELSE 'waiting' END
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_leave_approval_steps ON leave_requests;
CREATE TRIGGER trg_create_leave_approval_steps
  AFTER INSERT ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_create_leave_approval_steps();

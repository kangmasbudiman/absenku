-- leave_approval_v2.sql
-- Menambahkan dimensi jabatan (position) ke alur persetujuan cuti
-- Flow sekarang berdasarkan (org_id, division, position, level)

-- 1. Tambah kolom position
ALTER TABLE leave_approval_flows ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT '';

-- 2. Update existing data (pastikan semua row punya position='')
UPDATE leave_approval_flows SET position = '' WHERE position IS NULL;

-- 3. Ganti unique constraint
ALTER TABLE leave_approval_flows DROP CONSTRAINT IF EXISTS leave_approval_flows_org_id_division_level_key;
ALTER TABLE leave_approval_flows DROP CONSTRAINT IF EXISTS leave_approval_flows_org_id_division_position_level_key;
ALTER TABLE leave_approval_flows ADD CONSTRAINT leave_approval_flows_org_id_division_position_level_key
  UNIQUE (org_id, division, position, level);

-- 4. Ganti trigger function: lookup berdasarkan division + position, fallback ke default
CREATE OR REPLACE FUNCTION fn_create_leave_approval_steps()
RETURNS TRIGGER AS $$
DECLARE
  v_division text;
  v_position text;
  v_org_id uuid;
  flow_row RECORD;
  v_found boolean;
BEGIN
  SELECT p.division, p.org_id, COALESCE(p.position, '')
    INTO v_division, v_org_id, v_position
  FROM profiles p WHERE p.id = NEW.user_id;

  IF v_division IS NULL OR v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cek apakah ada flow spesifik untuk (division, position) karyawan
  SELECT true INTO v_found
  FROM leave_approval_flows
  WHERE org_id = v_org_id
    AND division = v_division
    AND position = v_position
    AND is_active = true
  LIMIT 1;

  IF v_found THEN
    -- Gunakan flow spesifik untuk jabatan ini
    FOR flow_row IN
      SELECT * FROM leave_approval_flows
      WHERE org_id = v_org_id
        AND division = v_division
        AND position = v_position
        AND is_active = true
      ORDER BY level
    LOOP
      INSERT INTO leave_approval_steps (
        leave_request_id, level, role_label, approver_user_id, status
      ) VALUES (
        NEW.id, flow_row.level, flow_row.role_label, flow_row.approver_user_id,
        CASE WHEN flow_row.level = 1 THEN 'pending' ELSE 'waiting' END
      );
    END LOOP;
  ELSE
    -- Fallback ke flow default (position = '')
    FOR flow_row IN
      SELECT * FROM leave_approval_flows
      WHERE org_id = v_org_id
        AND division = v_division
        AND position = ''
        AND is_active = true
      ORDER BY level
    LOOP
      INSERT INTO leave_approval_steps (
        leave_request_id, level, role_label, approver_user_id, status
      ) VALUES (
        NEW.id, flow_row.level, flow_row.role_label, flow_row.approver_user_id,
        CASE WHEN flow_row.level = 1 THEN 'pending' ELSE 'waiting' END
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

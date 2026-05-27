-- ══════════════════════════════════════════════════════════════
-- Trigger: notifikasi ke admin saat karyawan absen masuk
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_notify_checkin()
RETURNS TRIGGER AS $$
DECLARE
  emp_name  TEXT;
  org_id_val UUID;
  admin_row RECORD;
  checkin_time TEXT;
BEGIN
  SELECT p.full_name, p.org_id
    INTO emp_name, org_id_val
    FROM profiles p WHERE p.id = NEW.user_id;

  IF org_id_val IS NULL THEN RETURN NEW; END IF;

  checkin_time := TO_CHAR(
    COALESCE(NEW.check_in_time, NOW()) AT TIME ZONE 'Asia/Jakarta',
    'HH24:MI'
  );

  FOR admin_row IN
    SELECT id FROM profiles
    WHERE org_id = org_id_val AND role IN ('admin', 'hr')
  LOOP
    INSERT INTO notifications (user_id, title, message, body, type, link, is_read)
    VALUES (
      admin_row.id,
      emp_name || ' melakukan absen masuk',
      'Pukul ' || checkin_time || ' WIB',
      'Pukul ' || checkin_time || ' WIB',
      'attendance',
      '/dashboard/attendance',
      FALSE
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_checkin ON attendances;
CREATE TRIGGER trg_notify_checkin
  AFTER INSERT ON attendances
  FOR EACH ROW EXECUTE FUNCTION fn_notify_checkin();

-- ══════════════════════════════════════════════════════════════
-- Trigger: notifikasi ke admin saat karyawan ajukan cuti/izin
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_notify_leave_request()
RETURNS TRIGGER AS $$
DECLARE
  emp_name   TEXT;
  org_id_val UUID;
  admin_row  RECORD;
  type_label TEXT;
BEGIN
  SELECT p.full_name, p.org_id
    INTO emp_name, org_id_val
    FROM profiles p WHERE p.id = NEW.user_id;

  IF org_id_val IS NULL THEN RETURN NEW; END IF;

  type_label := CASE NEW.type
    WHEN 'izin'        THEN 'Izin'
    WHEN 'sakit'       THEN 'Sakit'
    WHEN 'cuti'        THEN 'Cuti Tahunan'
    WHEN 'cuti_tahunan' THEN 'Cuti Tahunan'
    WHEN 'cuti_khusus' THEN 'Cuti Khusus'
    WHEN 'darurat'     THEN 'Darurat'
    ELSE NEW.type
  END;

  FOR admin_row IN
    SELECT id FROM profiles
    WHERE org_id = org_id_val AND role IN ('admin', 'hr')
  LOOP
    INSERT INTO notifications (user_id, title, message, body, type, link, is_read)
    VALUES (
      admin_row.id,
      emp_name || ' mengajukan ' || type_label,
      NEW.start_date::TEXT || ' s/d ' || NEW.end_date::TEXT,
      NEW.start_date::TEXT || ' s/d ' || NEW.end_date::TEXT,
      'leave',
      '/dashboard/leave-approvals',
      FALSE
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_leave_request ON leave_requests;
CREATE TRIGGER trg_notify_leave_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_notify_leave_request();

-- ══════════════════════════════════════════════════════════════
-- Pastikan kolom message & link & entity_id ada di notifications
-- (jika belum ada dari schema awal)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link    TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Aktifkan Realtime untuk notifications (dan tabel lainnya)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;

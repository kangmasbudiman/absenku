-- Night shift support: crosses_midnight flag + updated trigger

-- 1. Add crosses_midnight column to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS crosses_midnight BOOLEAN DEFAULT false;

-- 2. Update calculate_attendance_status to handle night shifts
CREATE OR REPLACE FUNCTION calculate_attendance_status()
RETURNS TRIGGER AS $$
DECLARE
  v_shift shifts%ROWTYPE;
  v_scheduled_start TIMESTAMPTZ;
  v_scheduled_end TIMESTAMPTZ;
  v_late_minutes INTEGER;
  v_working_minutes DOUBLE PRECISION;
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.shift_id IS NOT NULL THEN
    SELECT * INTO v_shift FROM shifts WHERE id = NEW.shift_id;

    -- Scheduled start is always on the attendance date
    v_scheduled_start := (NEW.date + v_shift.start_time)::TIMESTAMPTZ;

    -- Calculate late minutes
    v_late_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.check_in_time - v_scheduled_start)) / 60)::INTEGER;
    NEW.late_minutes := v_late_minutes;

    IF v_late_minutes <= v_shift.late_tolerance_minutes THEN
      NEW.status := 'hadir';
    ELSE
      NEW.status := 'terlambat';
    END IF;
  END IF;

  -- Working minutes calculation
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    v_working_minutes := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;

    -- If shift crosses midnight, check for negative working minutes
    -- (check-out before check-in means clock-out is next day — already handled by timestamps)
    IF v_working_minutes < 0 THEN
      v_working_minutes := 0;
    END IF;

    NEW.working_minutes := v_working_minutes;

    -- Auto-detect overtime if shift info is available
    IF NEW.shift_id IS NOT NULL THEN
      SELECT * INTO v_shift FROM shifts WHERE id = NEW.shift_id;

      IF v_shift.crosses_midnight THEN
        -- Night shift: end is on the next day
        v_scheduled_end := (NEW.date + 1 + v_shift.end_time)::TIMESTAMPTZ;
      ELSE
        -- Normal shift: end is on the same day
        v_scheduled_end := (NEW.date + v_shift.end_time)::TIMESTAMPTZ;
      END IF;

      -- If check-out is after scheduled end, mark as overtime
      IF NEW.check_out_time > v_scheduled_end THEN
        NEW.is_lembur := true;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

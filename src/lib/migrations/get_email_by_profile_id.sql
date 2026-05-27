-- Function untuk mendapatkan email dari profile ID
-- Digunakan saat login dengan username
CREATE OR REPLACE FUNCTION get_email_by_profile_id(p_profile_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email FROM auth.users WHERE id = p_profile_id;
$$;

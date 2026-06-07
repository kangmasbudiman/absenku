export type UserRole = 'super_admin' | 'admin' | 'employee'
export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type PayrollStatus = 'draft' | 'finalized' | 'paid'

export interface Organization {
  id: string
  name: string
  company_code: string
  logo_url?: string
  address?: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  is_active: boolean
  registered_at: string
}

export interface Profile {
  id: string
  org_id: string
  department_id?: string
  full_name: string
  username?: string
  employee_id?: string
  role: UserRole
  phone?: string
  avatar_url?: string
  join_date?: string
  position?: string
  is_active: boolean
  created_at: string
  division?: string
  departments?: { name: string } | null
}

export interface FaceRegistration {
  id: string
  user_id: string
  face_data?: unknown
  face_descriptor_encrypted?: string | null
  face_photo_url?: string | null
  registered_at: string
  updated_at: string
}

export interface Department {
  id: string
  org_id: string
  name: string
  description?: string
}

export interface Shift {
  id: string
  org_id: string
  name: string
  start_time: string
  end_time: string
  late_tolerance_minutes: number
  work_days: number[]
  allowance: number
}

export interface OfficeLocation {
  id: string
  org_id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

export type AttendanceMethod = 'face' | 'qr_admin'

export interface Attendance {
  id: string
  user_id: string
  date: string
  status: AttendanceStatus
  check_in_time?: string
  check_out_time?: string
  late_minutes: number
  working_minutes: number
  is_check_in_mock_suspected: boolean
  method?: AttendanceMethod
  profiles?: { full_name: string; employee_id?: string }
}

export interface QrToken {
  id: string
  token: string
  org_id: string
  user_id: string
  generated_by: string
  shift_id?: string
  office_location_id?: string
  type: 'checkin' | 'checkout'
  status: 'active' | 'used' | 'expired'
  expires_at: string
  used_at?: string
  attendance_id?: string
  ip_address?: string
  created_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: ApprovalStatus
  created_at: string
  profiles?: { full_name: string }
}

export interface PayrollSlip {
  id: string
  period_id: string
  user_id: string
  total_present_days: number
  total_late_days: number
  total_absent_days: number
  base_salary: number
  net_salary: number
  is_published: boolean
  profiles?: { full_name: string; employee_id?: string }
}

export interface EmployeeSalary {
  id: string
  user_id: string
  base_salary: number
  daily_allowance: number
  overtime_rate_weekday: number
  late_deduction_per_minute: number
  absence_deduction: number
  effective_date: string
}

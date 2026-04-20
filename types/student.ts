export type UserRole = 'admin' | 'student'

export interface Profile {
  id: string
  student_id: string | null
  full_name: string
  nickname: string | null
  grade: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

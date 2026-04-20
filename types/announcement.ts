export type AnnouncementType = 'text' | 'image' | 'scores'

export interface ScoreRow {
  name: string
  student_id: string
  score: number
  grade?: string
  [key: string]: string | number | undefined
}

export interface Announcement {
  id: string
  type: AnnouncementType
  title: string
  content: string | null
  image_url: string | null
  is_important: boolean
  scores_data: ScoreRow[] | null
  created_by: string
  created_at: string
  updated_at: string
  author?: import('./student').Profile
}

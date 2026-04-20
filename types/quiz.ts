export type QuestionType = 'mcq' | 'essay' | 'fill'

export interface QuizOption {
  label: string
  text: string
}

export interface Question {
  id: string
  quiz_id: string
  type: QuestionType
  question_text: string
  options: QuizOption[] | null
  correct_answer: string | null
  points: number
  sort_order: number
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  pass_score: number
  time_limit: number | null
  is_open: boolean
  opens_at: string | null
  closes_at: string | null
  grade_filter: string[] | null
  created_by: string
  created_at: string
  updated_at: string
  questions?: Question[]
}

export interface Submission {
  id: string
  quiz_id: string
  student_id: string
  answers: Record<string, string | number>
  score: number | null
  is_passed: boolean | null
  time_taken: number | null
  submitted_at: string
  quiz?: Quiz
  student?: import('./student').Profile
}

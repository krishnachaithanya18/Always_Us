// API type definitions for Always Us

export interface HealthStatus {
  status: string
  database: string
  version: string
}

export interface AuthResponse {
  access_token: string
  expires_in: number
}

export interface RegisterResponse {
  account_code: string
  access_token: string
  expires_in: number
}

export interface Memory {
  id: string
  title: string
  description: string | null
  memory_date: string | null
  photo_filename: string | null
  is_favorite: boolean
  tags: { id: number; tag: string }[]
  created_at: string
  updated_at: string
}

export interface MemoryListResponse {
  total: number
  items: Memory[]
}

export interface MemoryCreate {
  title: string
  description?: string
  memory_date?: string
  tags?: string[]
  is_favorite?: boolean
}

export interface MemoryUpdate {
  title?: string
  description?: string
  memory_date?: string
  tags?: string[]
  is_favorite?: boolean
}

export type LetterCategory =
  | 'general'
  | 'miss_you'
  | 'bad_day'
  | 'reassurance'
  | 'cannot_sleep'
  | 'want_to_smile'
  | 'remember_us'
  | 'anniversary'
  | 'open_when'

export const LETTER_CATEGORY_LABELS: Record<LetterCategory, string> = {
  general: 'General',
  miss_you: 'When You Miss Me',
  bad_day: 'When You\'re Having a Bad Day',
  reassurance: 'When You Need Reassurance',
  cannot_sleep: 'When You Can\'t Sleep',
  want_to_smile: 'When You Need to Smile',
  remember_us: 'When You Want to Remember Us',
  anniversary: 'On Our Anniversary',
  open_when: 'Open When...',
}

export interface Letter {
  id: string
  title: string
  category: LetterCategory
  content: string
  authored_by: string
  is_favorite: boolean
  is_read: boolean
  reveal_date: string | null
  created_at: string
  updated_at: string
}

export interface LetterListResponse {
  total: number
  items: Letter[]
}

export interface LetterCreate {
  title: string
  category: LetterCategory
  content: string
  is_favorite?: boolean
  reveal_date?: string | null
}

export interface AppSettings {
  partner_name?: string
  my_name?: string
  relationship_title?: string
  anniversary_date?: string
  relationship_start_date?: string
  welcome_message?: string
  theme?: string
  featured_memory_id?: string
  timezone?: string
}

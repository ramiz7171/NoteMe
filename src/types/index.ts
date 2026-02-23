export type NoteType = 'basic' | 'java' | 'javascript' | 'python' | 'sql'

export interface Profile {
  id: string
  username: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  note_type: NoteType
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      notes: {
        Row: Note
        Insert: Omit<Note, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      note_type: NoteType
    }
  }
}

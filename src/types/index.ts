export type NoteType = 'basic' | 'checkbox' | 'java' | 'javascript' | 'python' | 'sql' | 'board'

export interface Profile {
  id: string
  username: string
  is_admin: boolean
  display_name: string
  avatar_url: string
  created_at: string
}

export interface Folder {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  note_type: NoteType
  archived: boolean
  pinned: boolean
  deleted_at: string | null
  folder_id: string | null
  color: string
  position: number
  created_at: string
  updated_at: string
}

export type TranscriptStatus = 'processing' | 'completed' | 'failed'

export interface SpeakerSegment {
  speaker: string
  text: string
}

export interface Transcript {
  id: string
  user_id: string
  title: string
  transcript_text: string
  speaker_segments: SpeakerSegment[]
  summary: string
  action_items: string
  audio_url: string
  status: TranscriptStatus
  duration_seconds: number
  tags: string[]
  meeting_id: string | null
  created_at: string
  updated_at: string
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface AgendaItem {
  text: string
  completed: boolean
}

export interface Meeting {
  id: string
  user_id: string
  title: string
  meeting_date: string
  duration_minutes: number
  participants: string[]
  tags: string[]
  agenda: AgendaItem[]
  status: MeetingStatus
  ai_notes: string
  follow_up: string
  audio_url: string
  transcript_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  email_summaries: boolean
  meeting_reminders: boolean
  transcript_ready: boolean
}

export interface UserSettings {
  id: string
  user_id: string
  ai_tone: 'professional' | 'casual' | 'concise' | 'detailed'
  summary_length: 'short' | 'medium' | 'long'
  notifications: NotificationSettings
  default_view: 'grid' | 'list'
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type FileFolderColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'

export interface FileFolder {
  id: string
  user_id: string
  name: string
  parent_folder_id: string | null
  color: FileFolderColor
  position: number
  created_at: string
  updated_at: string
}

export interface UserFile {
  id: string
  user_id: string
  folder_id: string | null
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  share_id: string | null
  share_expires_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      file_folders: {
        Row: {
          id: string
          user_id: string
          name: string
          parent_folder_id: string | null
          color: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          parent_folder_id?: string | null
          color?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          parent_folder_id?: string | null
          color?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived: boolean
          color: string
          content: string
          created_at: string
          deleted_at: string | null
          folder_id: string | null
          id: string
          note_type: Database["public"]["Enums"]["note_type"]
          pinned: boolean
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          pinned?: boolean
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          pinned?: boolean
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          avatar_url: string
          id: string
          is_admin: boolean
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          avatar_url?: string
          id: string
          is_admin?: boolean
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          avatar_url?: string
          id?: string
          is_admin?: boolean
          username?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          share_id: string | null
          share_expires_at: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          file_name: string
          file_type?: string
          file_size?: number
          storage_path: string
          share_id?: string | null
          share_expires_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          share_id?: string | null
          share_expires_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          id: string
          user_id: string
          title: string
          transcript_text: string
          speaker_segments: Json
          summary: string
          action_items: string
          audio_url: string
          status: string
          duration_seconds: number
          tags: Json
          meeting_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          transcript_text?: string
          speaker_segments?: Json
          summary?: string
          action_items?: string
          audio_url?: string
          status?: string
          duration_seconds?: number
          tags?: Json
          meeting_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          transcript_text?: string
          speaker_segments?: Json
          summary?: string
          action_items?: string
          audio_url?: string
          status?: string
          duration_seconds?: number
          tags?: Json
          meeting_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          title: string
          meeting_date: string
          duration_minutes: number
          participants: Json
          tags: Json
          agenda: Json
          status: string
          ai_notes: string
          follow_up: string
          audio_url: string
          transcript_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          meeting_date?: string
          duration_minutes?: number
          participants?: Json
          tags?: Json
          agenda?: Json
          status?: string
          ai_notes?: string
          follow_up?: string
          audio_url?: string
          transcript_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          meeting_date?: string
          duration_minutes?: number
          participants?: Json
          tags?: Json
          agenda?: Json
          status?: string
          ai_notes?: string
          follow_up?: string
          audio_url?: string
          transcript_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          ai_tone: string
          summary_length: string
          notifications: Json
          default_view: string
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_tone?: string
          summary_length?: string
          notifications?: Json
          default_view?: string
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_tone?: string
          summary_length?: string
          notifications?: Json
          default_view?: string
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      note_type: "basic" | "checkbox" | "java" | "javascript" | "python" | "sql" | "board"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

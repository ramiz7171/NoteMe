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
  expires_at: string | null
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
  share_password_hash: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  device_info: string
  created_at: string
}

export interface SessionRecord {
  id: string
  user_id: string
  session_token: string
  device_info: string
  ip_address: string
  last_active_at: string
  created_at: string
  is_current: boolean
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
      }
      folders: {
        Row: { id: string; user_id: string; name: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; name: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; name?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      notes: {
        Row: {
          archived: boolean; color: string; content: string; created_at: string
          deleted_at: string | null; expires_at: string | null; folder_id: string | null
          id: string; note_type: Database["public"]["Enums"]["note_type"]
          pinned: boolean; position: number; title: string; updated_at: string; user_id: string
        }
        Insert: {
          archived?: boolean; color?: string; content?: string; created_at?: string
          deleted_at?: string | null; expires_at?: string | null; folder_id?: string | null
          id?: string; note_type?: Database["public"]["Enums"]["note_type"]
          pinned?: boolean; position?: number; title: string; updated_at?: string; user_id: string
        }
        Update: {
          archived?: boolean; color?: string; content?: string; created_at?: string
          deleted_at?: string | null; expires_at?: string | null; folder_id?: string | null
          id?: string; note_type?: Database["public"]["Enums"]["note_type"]
          pinned?: boolean; position?: number; title?: string; updated_at?: string; user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; display_name: string; avatar_url: string; id: string; is_admin: boolean; username: string }
        Insert: { created_at?: string; display_name?: string; avatar_url?: string; id: string; is_admin?: boolean; username: string }
        Update: { created_at?: string; display_name?: string; avatar_url?: string; id?: string; is_admin?: boolean; username?: string }
        Relationships: []
      }
      user_files: {
        Row: { id: string; user_id: string; folder_id: string | null; file_name: string; file_type: string; file_size: number; storage_path: string; share_id: string | null; share_expires_at: string | null; share_password_hash: string | null; position: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; folder_id?: string | null; file_name: string; file_type?: string; file_size?: number; storage_path: string; share_id?: string | null; share_expires_at?: string | null; share_password_hash?: string | null; position?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; folder_id?: string | null; file_name?: string; file_type?: string; file_size?: number; storage_path?: string; share_id?: string | null; share_expires_at?: string | null; share_password_hash?: string | null; position?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      transcripts: {
        Row: { id: string; user_id: string; title: string; transcript_text: string; speaker_segments: Json; summary: string; action_items: string; audio_url: string; status: string; duration_seconds: number; tags: Json; meeting_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; transcript_text?: string; speaker_segments?: Json; summary?: string; action_items?: string; audio_url?: string; status?: string; duration_seconds?: number; tags?: Json; meeting_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; transcript_text?: string; speaker_segments?: Json; summary?: string; action_items?: string; audio_url?: string; status?: string; duration_seconds?: number; tags?: Json; meeting_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      meetings: {
        Row: { id: string; user_id: string; title: string; meeting_date: string; duration_minutes: number; participants: Json; tags: Json; agenda: Json; status: string; ai_notes: string; follow_up: string; audio_url: string; transcript_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; meeting_date?: string; duration_minutes?: number; participants?: Json; tags?: Json; agenda?: Json; status?: string; ai_notes?: string; follow_up?: string; audio_url?: string; transcript_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; meeting_date?: string; duration_minutes?: number; participants?: Json; tags?: Json; agenda?: Json; status?: string; ai_notes?: string; follow_up?: string; audio_url?: string; transcript_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      user_settings: {
        Row: { id: string; user_id: string; ai_tone: string; summary_length: string; notifications: Json; default_view: string; preferences: Json; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; ai_tone?: string; summary_length?: string; notifications?: Json; default_view?: string; preferences?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; ai_tone?: string; summary_length?: string; notifications?: Json; default_view?: string; preferences?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      audit_logs: {
        Row: { id: string; user_id: string; action: string; resource_type: string | null; resource_id: string | null; details: Json; device_info: string; created_at: string }
        Insert: { id?: string; user_id: string; action: string; resource_type?: string | null; resource_id?: string | null; details?: Json; device_info?: string; created_at?: string }
        Update: { id?: string; user_id?: string; action?: string; resource_type?: string | null; resource_id?: string | null; details?: Json; device_info?: string; created_at?: string }
        Relationships: []
      }
      passkeys: {
        Row: { id: string; user_id: string; credential_id: string; public_key: string; counter: number; device_name: string; transports: string[]; created_at: string }
        Insert: { id?: string; user_id: string; credential_id: string; public_key: string; counter?: number; device_name?: string; transports?: string[]; created_at?: string }
        Update: { id?: string; user_id?: string; credential_id?: string; public_key?: string; counter?: number; device_name?: string; transports?: string[]; created_at?: string }
        Relationships: []
      }
      recovery_codes: {
        Row: { id: string; user_id: string; code_hash: string; used: boolean; created_at: string }
        Insert: { id?: string; user_id: string; code_hash: string; used?: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; code_hash?: string; used?: boolean; created_at?: string }
        Relationships: []
      }
      sessions: {
        Row: { id: string; user_id: string; session_token: string; device_info: string; ip_address: string; last_active_at: string; created_at: string; is_current: boolean }
        Insert: { id?: string; user_id: string; session_token: string; device_info?: string; ip_address?: string; last_active_at?: string; created_at?: string; is_current?: boolean }
        Update: { id?: string; user_id?: string; session_token?: string; device_info?: string; ip_address?: string; last_active_at?: string; created_at?: string; is_current?: boolean }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_share_password: { Args: { p_file_id: string; p_password: string }; Returns: undefined }
      verify_share_password: { Args: { p_share_id: string; p_password: string }; Returns: boolean }
      get_shared_file: { Args: { p_share_id: string }; Returns: Json }
      generate_recovery_codes: { Args: { p_user_id: string }; Returns: string[] }
      verify_recovery_code: { Args: { p_user_id: string; p_code: string }; Returns: boolean }
      count_recovery_codes: { Args: { p_user_id: string }; Returns: number }
      cleanup_expired_notes: { Args: Record<string, never>; Returns: number }
    }
    Enums: {
      note_type: "basic" | "checkbox" | "java" | "javascript" | "python" | "sql" | "board"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

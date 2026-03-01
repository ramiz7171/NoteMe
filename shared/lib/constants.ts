export const AI_LIMITS = {
  summarize: { daily: 20, maxChars: 10_000 },
  grammar: { daily: 20, maxChars: 5_000 },
  codefix: { daily: 150, unit: 'lines' as const },
  transcript: { daily: 10 },
  meeting_notes: { daily: 10 },
  action_items: { daily: 15 },
  ai_writer: { daily: 15, maxChars: 5_000 },
} as const

export const NOTE_COLORS = [
  '', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#a3e635', '#fbbf24',
] as const

export const FOLDER_COLORS = ['blue', 'green', 'yellow', 'red', 'purple', 'gray'] as const

export const NOTE_TYPES = ['basic', 'checkbox', 'java', 'javascript', 'python', 'sql', 'board'] as const

export const DELETED_RETENTION_DAYS = 30

export const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export const MEETING_STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

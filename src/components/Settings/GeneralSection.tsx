import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../lib/supabase'
import { getDailyUsage, AI_LIMITS } from '../../lib/gemini'
import ToggleSwitch from '../shared/ToggleSwitch'
import CustomSelect from '../shared/CustomSelect'
import { inputClass, labelClass, sectionTitle, cardClass } from './settingsStyles'
import type { NotificationSettings } from '../../types'

interface GeneralSectionProps {
  showToast: (msg: string) => void
}

export default function GeneralSection({ showToast }: GeneralSectionProps) {
  const { user, profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings, loading, updateSettings } = useSettings()

  // ── Profile ──
  const [displayName, setDisplayName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name)
  }, [profile])

  const saveDisplayName = async () => {
    if (!user || !displayName.trim()) return
    setProfileSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)
    setProfileSaving(false)
    if (!error) showToast('Settings saved')
  }

  // ── AI Usage ──
  const [aiUsage, setAiUsage] = useState<Record<string, { used: number; limit: number }>>({})

  useEffect(() => {
    if (!user) return
    const features = [
      { key: 'summarize', limit: AI_LIMITS.summarize.daily },
      { key: 'grammar', limit: AI_LIMITS.grammar.daily },
      { key: 'transcript', limit: AI_LIMITS.transcript.daily },
      { key: 'meeting_notes', limit: AI_LIMITS.meeting_notes.daily },
    ]
    const usage: Record<string, { used: number; limit: number }> = {}
    for (const f of features) {
      const { used } = getDailyUsage(f.key, user.id, f.limit)
      usage[f.key] = { used, limit: f.limit }
    }
    setAiUsage(usage)
  }, [user])

  // ── Helpers ──
  const handleSettingsUpdate = async (updates: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(updates)
    showToast('Settings saved')
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return
    handleSettingsUpdate({
      notifications: { ...settings.notifications, [key]: value },
    })
  }

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      {/* ── Profile Section ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>Profile</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder="Your display name"
              />
              <button
                onClick={saveDisplayName}
                disabled={profileSaving || displayName.trim() === (profile?.display_name ?? '')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity shrink-0"
              >
                {profileSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={user?.email ?? ''} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input type="text" value={profile?.username ?? ''} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        </div>
      </div>

      {/* ── AI Preferences ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>AI Preferences</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Tone</label>
            <CustomSelect
              value={settings.ai_tone}
              onChange={val => handleSettingsUpdate({ ai_tone: val as typeof settings.ai_tone })}
              options={[
                { value: 'professional', label: 'Professional' },
                { value: 'casual', label: 'Casual' },
                { value: 'concise', label: 'Concise' },
                { value: 'detailed', label: 'Detailed' },
              ]}
              size="md"
            />
          </div>
          <div>
            <label className={labelClass}>Summary Length</label>
            <CustomSelect
              value={settings.summary_length}
              onChange={val => handleSettingsUpdate({ summary_length: val as typeof settings.summary_length })}
              options={[
                { value: 'short', label: 'Short' },
                { value: 'medium', label: 'Medium' },
                { value: 'long', label: 'Long' },
              ]}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>Appearance</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Currently using {theme} theme</p>
            </div>
            <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Default View</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{settings.default_view === 'grid' ? 'Grid view' : settings.default_view === 'infinite' ? 'Infinite view' : 'Tab view'}</p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => handleSettingsUpdate({ default_view: 'grid' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.default_view === 'grid' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >Grid</button>
              <button
                onClick={() => handleSettingsUpdate({ default_view: 'list' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.default_view === 'list' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >List</button>
              <button
                onClick={() => handleSettingsUpdate({ default_view: 'infinite' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.default_view === 'infinite' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >Infinite</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>Notifications</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Preferences saved — delivery coming soon</p>
        <div className="flex flex-col gap-4">
          <ToggleSwitch checked={settings.notifications?.email_summaries ?? false} onChange={v => handleNotificationChange('email_summaries', v)} label="Email Summaries" />
          <ToggleSwitch checked={settings.notifications?.meeting_reminders ?? false} onChange={v => handleNotificationChange('meeting_reminders', v)} label="Meeting Reminders" />
          <ToggleSwitch checked={settings.notifications?.transcript_ready ?? false} onChange={v => handleNotificationChange('transcript_ready', v)} label="Transcript Ready" />
        </div>
      </div>

      {/* ── Account Info ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>Account Info</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Member since</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : '--'}
            </span>
          </div>
          {profile?.is_admin && (
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white">
                Admin
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Usage Today</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'summarize', label: 'Summarize' },
                { key: 'grammar', label: 'Grammar' },
                { key: 'transcript', label: 'Transcript' },
                { key: 'meeting_notes', label: 'Meeting Notes' },
              ].map(({ key, label }) => {
                const usage = aiUsage[key]
                const used = usage?.used ?? 0
                const limit = usage?.limit ?? 0
                const isAdmin = profile?.is_admin ?? false
                const pct = isAdmin ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0
                return (
                  <div key={key} className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{used} / {isAdmin ? '\u221E' : limit}</p>
                    {!isAdmin && (
                      <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-black dark:bg-white transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

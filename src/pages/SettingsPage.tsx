import { useState, useCallback } from 'react'
import SettingsSidebar, { type SettingsSection } from '../components/Settings/SettingsSidebar'
import GeneralSection from '../components/Settings/GeneralSection'
import SecuritySection from '../components/Settings/SecuritySection'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  // ── Toast ──
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}

      {/* Desktop sidebar */}
      <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Content area */}
      <div className="flex-1 h-full overflow-y-auto">
        {/* Mobile tab bar */}
        <div className="md:hidden sticky top-0 z-10 bg-[#f0f0f0] dark:bg-[#141414] px-3 pt-3 pb-2">
          <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>

        <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

          {activeSection === 'general' && <GeneralSection showToast={showToast} />}
          {activeSection === 'security' && <SecuritySection showToast={showToast} />}

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

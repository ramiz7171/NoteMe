interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : ''}`} />
      </button>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  )
}

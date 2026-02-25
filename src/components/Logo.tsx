import logo from '../assets/logo.png'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="NoteMe"
      className={`h-44 object-contain dark:brightness-0 dark:invert ${className}`}
    />
  )
}

import logo from '../assets/logo.png'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Criptnote"
      className={`object-contain dark:brightness-0 dark:invert ${className}`}
    />
  )
}

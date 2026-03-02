import GhostCursor from '../components/Welcome/GhostCursor'
import LoginForm from '../components/Auth/LoginForm'

export default function AuthPage() {
  return (
    <>
      <GhostCursor
        color="#7686FF"
        bloomStrength={0.08}
        bloomRadius={0.8}
        bloomThreshold={0.02}
        brightness={0.8}
        mixBlendMode="screen"
        trailLength={40}
        inertia={0.5}
        grainIntensity={0.04}
        zIndex={1}
      />

      <div className="relative h-screen bg-black overflow-hidden flex items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </>
  )
}

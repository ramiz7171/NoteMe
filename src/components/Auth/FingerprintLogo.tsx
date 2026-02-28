import './fingerprint.css'

export default function FingerprintLogo() {
  return (
    <div className="fingerprint-container">
      <svg
        className="fingerprint-svg"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer arcs */}
        <path
          className="fp-line fp-1"
          d="M30 85 C20 65, 22 40, 40 25 C55 13, 75 13, 90 28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-2"
          d="M35 82 C27 65, 28 45, 43 32 C55 22, 72 21, 85 33"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-3"
          d="M40 80 C33 66, 34 48, 46 38 C56 30, 70 29, 80 38"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Middle curves */}
        <path
          className="fp-line fp-4"
          d="M44 78 C39 66, 40 52, 49 44 C56 38, 67 37, 75 44"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-5"
          d="M48 76 C44 67, 45 55, 52 49 C57 45, 65 44, 71 49"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Core center */}
        <path
          className="fp-line fp-6"
          d="M52 74 C49 67, 50 58, 55 54 C58 51, 63 51, 66 54"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-7"
          d="M56 72 C54 67, 55 61, 58 58 C59 57, 61 57, 62 58"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right-side descending arcs */}
        <path
          className="fp-line fp-8"
          d="M90 28 C98 38, 100 55, 95 70 C92 78, 86 85, 78 90"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-9"
          d="M85 33 C92 42, 93 55, 89 68 C86 76, 80 82, 72 86"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-10"
          d="M80 38 C86 46, 87 56, 84 66 C81 73, 76 78, 68 82"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="fp-line fp-11"
          d="M75 44 C80 50, 81 58, 78 66 C76 71, 72 75, 65 78"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Scan line */}
        <line
          className="fp-scan"
          x1="18"
          y1="60"
          x2="102"
          y2="60"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Glow pulse behind */}
      <div className="fingerprint-glow" />
    </div>
  )
}

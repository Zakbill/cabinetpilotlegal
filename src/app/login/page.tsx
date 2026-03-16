import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — fond zinc-50 doux, formulaire centré dans une card avec border beam */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 px-8 py-12">
        <div style={{ maxWidth: 'var(--size-login-max)', width: '100%' }}>

          {/* Logo CabinetPilot — au-dessus de la card */}
          <div className="mb-6 text-center">
            <span className="font-display text-[18px] font-semibold text-zinc-900">
              CabinetPilot
            </span>
          </div>

          {/* Card avec border beam animé */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: '1.5px' }}>
            {/* Beam rotatif — conic-gradient qui tourne */}
            <div
              className="absolute pointer-events-none"
              style={{
                inset: '-100%',
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 55%, #4f46e5 65%, #6d28d9 75%, transparent 85%)',
                animation: 'border-beam 4s linear infinite',
              }}
              aria-hidden="true"
            />
            {/* Contenu de la card */}
            <div className="relative bg-white rounded-[10px] px-8 py-10 shadow-sm">
              <LoginForm />
            </div>
          </div>

        </div>
      </div>

      {/* Panneau droit — gradient indigo, caché sous md */}
      <div
        className="hidden md:flex flex-1 items-center justify-center px-12"
        style={{ background: 'var(--gradient-login-panel)' }}
      >
        <div style={{ maxWidth: '320px' }}>
          <h2 className="font-display text-[32px] font-semibold text-white leading-tight">
            Pilotez vos missions juridiques en un coup&nbsp;d&apos;œil
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
            Suivez chaque dossier AGO, assignez vos équipes et synchronisez automatiquement depuis Pennylane.
          </p>
        </div>
      </div>
    </div>
  )
}

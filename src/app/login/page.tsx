import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — soft zinc-50, centered card ── */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 px-8 py-12">
        <div style={{ maxWidth: 'var(--size-login-max)', width: '100%' }}>

          {/* Logo */}
          <div className="mb-7 text-center">
            <span className="font-display text-[18px] font-semibold text-zinc-900 tracking-tight">
              CabinetPilot
            </span>
          </div>

          {/* Card with border beam */}
          <div className="relative rounded-2xl overflow-hidden" style={{ padding: '1.5px' }}>
            {/* Rotating beam */}
            <div
              className="absolute pointer-events-none select-none"
              style={{
                inset: '-100%',
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 60%, rgba(99,102,241,0.9) 70%, rgba(139,92,246,0.8) 77%, transparent 87%)',
                animation: 'border-beam 5s linear infinite',
              }}
              aria-hidden="true"
            />
            {/* Card body */}
            <div
              className="relative bg-white rounded-[14px] px-8 py-9"
              style={{
                boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
              }}
            >
              <LoginForm />
            </div>
          </div>

        </div>
      </div>

      {/* ── Right panel — dark premium (Vercel/Linear vibe) ── */}
      <div
        className="hidden md:flex flex-1 items-center justify-center px-12 relative overflow-hidden"
        style={{ background: '#08080f' }}
      >
        {/* Radial indigo spotlight from top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(99,102,241,0.28) 0%, rgba(99,102,241,0.06) 50%, transparent 75%)',
          }}
          aria-hidden="true"
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
          aria-hidden="true"
        />
        {/* Bottom vignette — fades dots into dark */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #08080f 0%, transparent 100%)' }}
          aria-hidden="true"
        />
        {/* Top vignette */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #08080f 0%, transparent 100%)' }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10" style={{ maxWidth: '300px' }}>
          <p className="mb-4 text-xs font-medium tracking-widest uppercase"
            style={{ color: 'rgba(99,102,241,0.7)' }}>
            CabinetPilot
          </p>
          <h2
            className="font-display text-[32px] font-semibold leading-tight"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Pilotez vos missions juridiques en un coup&nbsp;d&apos;œil
          </h2>
          <p
            className="mt-5 text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            Suivez chaque dossier AGO, assignez vos équipes et synchronisez automatiquement depuis Pennylane.
          </p>

          {/* Subtle divider */}
          <div
            className="mt-8 h-px w-12"
            style={{ background: 'rgba(99,102,241,0.35)' }}
          />
        </div>
      </div>

    </div>
  )
}

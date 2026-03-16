import { LoginForm } from '@/components/auth/LoginForm'
import { AnimatedGradient } from '@/components/ui/stripe-animated-gradient'
import { CursorCard, CursorCardsContainer } from '@/components/ui/cursor-cards'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — zinc-50 with subtle dot grid ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-12 bg-zinc-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
      >
        <div style={{ maxWidth: 'var(--size-login-max)', width: '100%' }}>

          {/* Logo */}
          <div className="mb-7 text-center">
            <span className="font-display text-[18px] font-semibold text-zinc-900 tracking-tight">
              CabinetPilot
            </span>
          </div>

          {/* CursorCard — extremely subtle glow border */}
          <CursorCardsContainer className="rounded-lg">
            <CursorCard
              className="rounded-lg"
              illuminationRadius={320}
              illuminationColor="#4f46e508"
              illuminationOpacity={0.12}
              primaryHue="#c7d2fe28"
              secondaryHue="#e0e7ff12"
              borderColor="#e4e4e7"
            >
              <div className="px-8 py-9">
                <LoginForm />
              </div>
            </CursorCard>
          </CursorCardsContainer>

        </div>
      </div>

      {/* ── Right panel — animated sunset gradient ── */}
      <div className="hidden md:flex flex-1 items-center justify-center px-12 relative overflow-hidden">
        {/* Animated gradient canvas fills the panel */}
        <AnimatedGradient
          color1="#8b5cf6"
          color2="#fb923c"
          color3="#ec4899"
          color4="#38bdf8"
        />

        {/* Dark overlay for text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.28)' }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10" style={{ maxWidth: '300px' }}>
          <p className="mb-4 text-xs font-medium tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            CabinetPilot
          </p>
          <h2
            className="font-display text-[32px] font-semibold leading-tight"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Pilotez vos missions juridiques en un coup&nbsp;d&apos;œil
          </h2>
          <p
            className="mt-5 text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.60)' }}
          >
            Suivez chaque dossier AGO, assignez vos équipes et synchronisez automatiquement depuis Pennylane.
          </p>
          <div
            className="mt-8 h-px w-12"
            style={{ background: 'rgba(255,255,255,0.30)' }}
          />
        </div>
      </div>

    </div>
  )
}

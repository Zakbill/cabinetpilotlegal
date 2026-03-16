'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './StepIndicator'
import { StepProfil } from './steps/StepProfil'
import { StepCabinet } from './steps/StepCabinet'
import { StepPennylane } from './steps/StepPennylane'
import { StepSync } from './steps/StepSync'
import { useOnboardingStep } from '@/hooks/useOnboardingStep'
import { completeOnboarding } from '@/app/onboarding/actions'
import { CursorCard, CursorCardsContainer } from '@/components/ui/cursor-cards'

interface OnboardingWizardProps {
  initialStep: number
  isInvited: boolean
  initialProfile: { first_name: string; last_name: string; phone: string }
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
}

export function OnboardingWizard({ initialStep, isInvited, initialProfile }: OnboardingWizardProps) {
  const router = useRouter()
  const { currentStep, direction, goNext, goPrev } = useOnboardingStep(initialStep, isInvited)

  const handleComplete = async () => {
    await completeOnboarding()
    router.refresh()
    router.push('/dashboard')
  }

  const stepComponents: Record<number, React.ReactNode> = {
    1: (
      <StepProfil
        initialProfile={initialProfile}
        onNext={goNext}
        isInvited={isInvited}
        onComplete={isInvited ? handleComplete : undefined}
      />
    ),
    2: <StepCabinet onNext={goNext} onBack={goPrev} />,
    3: <StepPennylane onNext={goNext} onSkip={goNext} onBack={goPrev} />,
    4: <StepSync onComplete={handleComplete} onSkip={handleComplete} onBack={goPrev} />,
  }

  return (
    <div style={{ maxWidth: 'var(--size-wizard-max)', width: '100%' }}>
      {/* Step indicator — hidden for invited users */}
      {!isInvited && (
        <StepIndicator currentStep={currentStep} totalSteps={4} />
      )}

      {/* Wizard card — CursorCard for premium subtle glow */}
      <CursorCardsContainer className="rounded-lg">
        <CursorCard
          className="rounded-lg"
          illuminationRadius={400}
          illuminationColor="#4f46e508"
          illuminationOpacity={0.10}
          primaryHue="#c7d2fe22"
          secondaryHue="#e0e7ff10"
          borderColor="#e4e4e7"
        >
          <div className="p-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {stepComponents[currentStep]}
              </motion.div>
            </AnimatePresence>
          </div>
        </CursorCard>
      </CursorCardsContainer>
    </div>
  )
}

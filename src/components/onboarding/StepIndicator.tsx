'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['Profil', 'Cabinet', 'Pennylane', 'Sync']

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div
      className="flex items-center justify-center mb-8"
      role="list"
      aria-label="Étapes de l'onboarding"
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep

        return (
          <div key={stepNum} className="flex items-center" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex items-center justify-center rounded-full text-sm font-semibold',
                  'w-8 h-8 transition-colors duration-200',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : isCompleted
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-zinc-200 text-zinc-400',
                ].join(' ')}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`mt-1.5 text-sm ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>

            {/* Connecting line */}
            {stepNum < totalSteps && (
              <div className="w-12 h-px bg-zinc-200 mx-2 mb-5" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

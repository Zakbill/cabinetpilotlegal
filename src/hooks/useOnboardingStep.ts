'use client'

import { useState } from 'react'

export function useOnboardingStep(initialStep: number, isInvited: boolean) {
  const maxStep = isInvited ? 1 : 4
  const [currentStep, setCurrentStep] = useState(Math.min(initialStep, maxStep))
  const [direction, setDirection] = useState(1)

  const goNext = () => {
    if (currentStep < maxStep) {
      setDirection(1)
      setCurrentStep(s => s + 1)
    }
  }

  const goPrev = () => {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(s => s - 1)
    }
  }

  return { currentStep, direction, goNext, goPrev, maxStep }
}

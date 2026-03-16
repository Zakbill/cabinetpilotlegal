'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

interface ConfirmationScreenProps {
  email: string
  onBack: () => void
  onResend: () => Promise<{ error?: string } | { success: true }>
}

export function ConfirmationScreen({ email, onBack, onResend }: ConfirmationScreenProps) {
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResend = async () => {
    setResending(true)
    setResendMessage(null)
    const result = await onResend()
    setResending(false)

    if ('error' in result) {
      setResendMessage(result.error!)
    } else {
      setResendMessage('Lien renvoyé !')
    }
  }

  return (
    <div className="space-y-5">

      {/* Icône envelope */}
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Mail className="h-7 w-7 text-indigo-600" aria-hidden="true" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-[20px] font-semibold text-zinc-900 leading-snug">
          Vérifiez votre boîte mail
        </h1>
        <p className="text-base text-zinc-600 leading-relaxed">
          Un lien de connexion a été envoyé à{' '}
          <span className="font-semibold text-zinc-900">{email}</span>.
          {' '}Le lien expire dans 1 heure.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-indigo-600 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? 'Envoi...' : 'Renvoyer le lien'}
        </button>

        {resendMessage && (
          <p
            className={`text-sm ${resendMessage.includes('!') ? 'text-green-600' : 'text-red-500'}`}
            role="status"
          >
            {resendMessage}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
      >
        ← Modifier l&apos;adresse e-mail
      </button>

    </div>
  )
}

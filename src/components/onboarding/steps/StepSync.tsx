'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface StepSyncProps {
  onComplete: () => Promise<void>
  onSkip: () => Promise<void>
  onBack: () => void
}

export function StepSync({ onComplete, onSkip, onBack }: StepSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number } | null>(null)
  const [completing, setCompleting] = useState(false)

  const handleSync = async () => {
    setSyncStatus('loading')
    setSyncError(null)

    try {
      // TODO Phase 5 : appeler l'Edge Function sync-pennylane
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSyncResult({ created: 0, updated: 0 })
      setSyncStatus('success')
    } catch {
      setSyncStatus('error')
      setSyncError('La synchronisation a échoué. Vérifiez vos credentials Pennylane dans les Paramètres.')
    }
  }

  const handleFinish = async () => {
    setCompleting(true)
    await onComplete()
  }

  const handleSkip = async () => {
    setCompleting(true)
    await onSkip()
  }

  const showFinishButton = syncStatus === 'success' || syncStatus === 'error'

  return (
    <div className="space-y-5">
      <h2 className="text-[22px] font-semibold text-zinc-900 leading-snug">
        Première synchronisation
      </h2>
      <p className="text-base text-zinc-600">
        Importez vos dossiers Pennylane pour démarrer.
      </p>

      {syncStatus === 'success' && syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Synchronisation terminée — {syncResult.created} dossiers créés, {syncResult.updated} mis à jour.
        </div>
      )}
      {syncStatus === 'error' && syncError && (
        <p className="text-sm text-red-500" role="alert">{syncError}</p>
      )}

      <div className="space-y-2 pt-1">
        {!showFinishButton ? (
          <Button
            type="button"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
            onClick={handleSync}
            disabled={syncStatus === 'loading'}
          >
            {syncStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {syncStatus === 'loading' ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
            onClick={handleFinish}
            disabled={completing}
          >
            {completing ? 'Redirection...' : 'Accéder au dashboard'}
          </Button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          disabled={completing}
          className="w-full text-sm text-zinc-400 hover:text-zinc-600 py-2 transition-colors disabled:opacity-50"
        >
          Passer et aller au dashboard
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-zinc-400 hover:text-zinc-600 py-2 transition-colors"
        >
          ← Retour
        </button>
      </div>
    </div>
  )
}

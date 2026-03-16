'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { savePennylaneStep } from '@/app/onboarding/actions'

const pennylaneSchema = z.object({
  host: z.string().min(1, "L'hôte est requis"),
  port: z.string().min(1, 'Le port est requis'),
  dbname: z.string().min(1, 'Le nom de la base est requis'),
  user: z.string().min(1, "L'utilisateur est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type PennylaneValues = z.infer<typeof pennylaneSchema>
type TestStatus = 'idle' | 'loading' | 'success' | 'error'

interface StepPennylaneProps {
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

export function StepPennylane({ onNext, onSkip, onBack }: StepPennylaneProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const form = useForm<PennylaneValues>({
    resolver: zodResolver(pennylaneSchema),
    defaultValues: { port: '5439' },
  })

  const handleTestConnection = async () => {
    setTestStatus('loading')
    setTestError(null)

    try {
      const valid = await form.trigger()
      if (!valid) {
        setTestStatus('error')
        setTestError('Connexion impossible : champs invalides. Vérifiez vos identifiants.')
        return
      }
      // TODO Phase 5 : appeler /api/test-pennylane-connection
      setTestStatus('success')
    } catch {
      setTestStatus('error')
      setTestError('Connexion impossible : erreur réseau. Vérifiez vos identifiants.')
    }
  }

  const handleSubmit = async () => {
    await savePennylaneStep()
    onNext()
  }

  const inputClass = 'h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20'

  return (
    <div className="space-y-5">
      <h2 className="text-[22px] font-semibold text-zinc-900 leading-snug">
        Connexion Pennylane
      </h2>

      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hôte Redshift</FormLabel>
                    <FormControl>
                      <Input className={inputClass} placeholder="xxx.redshift.amazonaws.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input className={inputClass} placeholder="5439" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="dbname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la base</FormLabel>
                <FormControl>
                  <Input className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilisateur</FormLabel>
                  <FormControl>
                    <Input className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>

      {/* Test connection button */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12"
        onClick={handleTestConnection}
        disabled={testStatus === 'loading'}
      >
        {testStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {testStatus === 'success' && <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />}
        {testStatus === 'error' && <XCircle className="mr-2 h-4 w-4 text-red-600" />}
        {testStatus === 'loading'
          ? 'Test en cours...'
          : testStatus === 'success'
          ? 'Connexion réussie'
          : 'Tester la connexion'}
      </Button>
      {testStatus === 'error' && testError && (
        <p className="text-sm text-red-500" role="alert">{testError}</p>
      )}

      <div className="space-y-2 pt-1">
        <Button
          type="button"
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          onClick={handleSubmit}
        >
          Continuer
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-sm text-zinc-400 hover:text-zinc-600 py-2 transition-colors"
        >
          Configurer plus tard
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

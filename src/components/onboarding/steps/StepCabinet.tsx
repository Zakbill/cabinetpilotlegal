'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { saveCabinetStep } from '@/app/onboarding/actions'
import { createClient } from '@/lib/supabase/client'

const cabinetSchema = z.object({
  org_name: z.string().min(2, 'Le nom du cabinet est requis (minimum 2 caractères)'),
})

type CabinetValues = z.infer<typeof cabinetSchema>

interface StepCabinetProps {
  onNext: () => void
  onBack: () => void
}

export function StepCabinet({ onNext, onBack }: StepCabinetProps) {
  const form = useForm<CabinetValues>({ resolver: zodResolver(cabinetSchema), defaultValues: { org_name: '' } })
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: CabinetValues) => {
    setServerError(null)
    const result = await saveCabinetStep(values.org_name)
    if ('error' in result) {
      setServerError(result.error ?? 'Une erreur est survenue')
      return
    }

    // Refresh session so new JWT claims (org_id, role) are active
    const supabase = createClient()
    await supabase.auth.refreshSession()

    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <h2 className="text-[22px] font-semibold text-zinc-900 leading-snug">
          Votre cabinet
        </h2>

        <FormField
          control={form.control}
          name="org_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du groupe</FormLabel>
              <FormControl>
                <Input
                  placeholder="Cabinet Dupont & Associés"
                  className="h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
                  {...field}
                />
              </FormControl>
              <p className="text-sm text-zinc-500">
                Ce nom sera visible par tous les membres de votre organisation
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p className="text-sm text-red-500" role="alert">{serverError}</p>
        )}

        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Création...' : 'Continuer'}
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-sm text-zinc-400 hover:text-zinc-600 py-2 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </form>
    </Form>
  )
}

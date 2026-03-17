'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
} from '@/components/ui/form'
import { sendMagicLink } from '@/app/login/actions'
import { ConfirmationScreen } from './ConfirmationScreen'

const loginSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    const result = await sendMagicLink(values.email)

    if ('error' in result) {
      setServerError(result.error!)
      return
    }

    setSentEmail(values.email)
    setSent(true)
  }

  if (sent) {
    return (
      <ConfirmationScreen
        email={sentEmail}
        onBack={() => {
          setSent(false)
          setSentEmail('')
          form.reset()
        }}
        onResend={() => sendMagicLink(sentEmail)}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>

        <div>
          <h1 className="text-[20px] font-semibold text-zinc-900 leading-snug">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pas de mot de passe — connexion sécurisée par lien e-mail
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="text-sm font-normal text-zinc-700"
              >
                Adresse e-mail
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="vous@cabinet.fr"
                autoComplete="email"
                className="h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
                {...field}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Erreur serveur (rate limit, etc.) */}
        {serverError && (
          <p className="text-sm text-red-500" role="alert">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? 'Envoi en cours...'
            : 'Recevoir mon lien de connexion'}
        </Button>

      </form>
    </Form>
  )
}

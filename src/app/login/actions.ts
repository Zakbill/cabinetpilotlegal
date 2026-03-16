'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendMagicLink(
  email: string
): Promise<{ error?: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('rate limit') || error.message.includes('too many')) {
      return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }
    }
    if (error.message.includes('invalid email') || error.message.includes('valid email')) {
      return { error: 'Adresse e-mail invalide' }
    }
    return { error: 'Une erreur est survenue. Veuillez réessayer.' }
  }

  return { success: true }
}

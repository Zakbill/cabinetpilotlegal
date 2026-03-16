import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/onboarding'

  // Build the redirect response first so we can attach cookies to it
  const redirectUrl = new URL(next, origin)
  const response    = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let exchangeError: string | null = null

  // --- Flow 1: PKCE (code param) ---
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) exchangeError = error.message
  }
  // --- Flow 2: magic-link / OTP (token_hash + type) ---
  else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) exchangeError = error.message
  }
  else {
    exchangeError = 'missing_params'
  }

  if (exchangeError) {
    const errorUrl = new URL('/login?error=auth_callback_failed', origin)
    return NextResponse.redirect(errorUrl)
  }

  // Session established — check profile to decide where to send the user
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Handle invitation metadata
    const inviteMeta = user.user_metadata as {
      organization_id?: string
      role?: 'expert-comptable' | 'collaborateur'
      cabinet_ids?: string[]
    }

    if (inviteMeta?.organization_id) {
      await supabase.from('profiles').update({
        organization_id: inviteMeta.organization_id,
        role: inviteMeta.role ?? 'collaborateur',
      }).eq('id', user.id)

      if (inviteMeta.cabinet_ids?.length) {
        await supabase.from('user_cabinet_assignments').insert(
          inviteMeta.cabinet_ids.map(cabinetId => ({
            user_id: user.id,
            cabinet_id: cabinetId,
          }))
        )
      }
    }

    // Route based on profile completion
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_complete')
      .eq('id', user.id)
      .single()

    const destination = profile?.is_complete ? '/dashboard' : '/onboarding'
    response.headers.set('Location', new URL(destination, origin).toString())
  }

  return response
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' param optionnel — utilisé pour deep link après login
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Détecter les métadonnées d'invitation dans user_metadata
        const inviteMeta = user.user_metadata as {
          organization_id?: string
          role?: 'expert-comptable' | 'collaborateur'
          cabinet_ids?: string[]
          invited_by?: string
        }

        if (inviteMeta?.organization_id) {
          // Utilisateur invité — pré-assigner org + role dans profiles
          await supabase.from('profiles').update({
            organization_id: inviteMeta.organization_id,
            role: inviteMeta.role ?? 'collaborateur',
          }).eq('id', user.id)

          // Pré-assigner les cabinets si fournis
          if (inviteMeta.cabinet_ids && inviteMeta.cabinet_ids.length > 0) {
            const assignments = inviteMeta.cabinet_ids.map(cabinetId => ({
              user_id: user.id,
              cabinet_id: cabinetId,
            }))
            await supabase.from('user_cabinet_assignments').insert(assignments)
          }
        }

        // Vérifier is_complete pour la redirection
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_complete')
          .eq('id', user.id)
          .single()

        if (!profile?.is_complete) {
          return NextResponse.redirect(new URL('/onboarding', origin))
        }
      }

      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Erreur d'échange de code → retour login avec erreur
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_failed', origin)
  )
}

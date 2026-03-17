import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { InvitationEmail } from '@/components/emails/InvitationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface InvitePayload {
  email: string
  role: 'expert-comptable' | 'collaborateur'
  cabinet_ids?: string[]
}

export async function POST(request: Request) {
  // Vérifier que l'appelant est authentifié
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Vérifier le rôle de l'invitant
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('role, organization_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (inviterProfile?.role !== 'expert-comptable') {
    return NextResponse.json(
      { error: 'Seul un expert-comptable peut inviter des membres' },
      { status: 403 }
    )
  }

  if (!inviterProfile?.organization_id) {
    return NextResponse.json({ error: 'Organisation non configurée' }, { status: 400 })
  }

  // Valider le payload
  let payload: InvitePayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de la requête invalide' }, { status: 400 })
  }

  const { email, role, cabinet_ids = [] } = payload

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
  }

  if (!['expert-comptable', 'collaborateur'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // Récupérer le nom de l'organisation pour l'email
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', inviterProfile.organization_id)
    .single()

  const orgName =
    org?.name ?? 'votre organisation'
  const inviterName =
    [inviterProfile.first_name, inviterProfile.last_name].filter(Boolean).join(' ') ||
    'Un expert-comptable'

  // Envoyer l'invitation via Supabase Admin (service role — bypasse RLS)
  const supabaseAdmin = getAdminClient()
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    data: {
      // Ces données sont lues par /auth/callback (Plan 04) pour pré-configurer le profil invité
      invited_by: user.id,
      organization_id: inviterProfile.organization_id,
      role,
      cabinet_ids,
    },
  })

  if (inviteError) {
    // Cas spéciaux : utilisateur déjà inscrit ou déjà invité
    if (
      inviteError.message.includes('already been invited') ||
      inviteError.message.includes('already registered')
    ) {
      return NextResponse.json(
        { error: "Impossible d'envoyer l'invitation. Vérifiez l'adresse e-mail et réessayez." },
        { status: 400 }
      )
    }
    console.error('inviteUserByEmail error:', inviteError)
    return NextResponse.json(
      { error: "Impossible d'envoyer l'invitation. Vérifiez l'adresse e-mail et réessayez." },
      { status: 500 }
    )
  }

  // Envoyer l'email brandé CabinetPilot via Resend
  // Note : Supabase envoie aussi son propre email natif d'invitation.
  // Pour éviter un doublon, vider le template d'invitation dans
  // Supabase Dashboard → Auth → Email Templates → Invite.
  try {
    await resend.emails.send({
      from: 'CabinetPilot <onboarding@legal.cabinetpilot.io>',
      to: [email],
      subject: `Vous êtes invité à rejoindre ${orgName} sur CabinetPilot`,
      react: InvitationEmail({ orgName, inviterName }),
    })
  } catch (resendError) {
    // Email Resend optionnel — ne pas bloquer si Resend échoue
    console.error('Resend error (non-blocking):', resendError)
  }

  return NextResponse.json({
    success: true,
    message: `Invitation envoyée à ${email}`,
  })
}

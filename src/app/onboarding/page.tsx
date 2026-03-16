import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, avatar_url, organization_id, current_onboarding_step, is_complete')
    .eq('id', user.id)
    .single()

  if (profile?.is_complete) redirect('/dashboard')

  const isInvited = !!profile?.organization_id

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-zinc-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
    >
      <OnboardingWizard
        initialStep={profile?.current_onboarding_step ?? 1}
        isInvited={isInvited}
        initialProfile={{
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
        }}
      />
    </main>
  )
}

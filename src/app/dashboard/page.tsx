'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-[32px] font-semibold text-zinc-900">
          CabinetPilot
        </h1>
        <p className="mt-2 text-zinc-600">
          Bienvenue, {profile?.first_name ?? 'utilisateur'} — dashboard Phase 3.
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Rôle : {profile?.role ?? 'non assigné'}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes accessibles sans session active
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/']

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Routes publiques — pas de vérification de session
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    // Si déjà connecté sur /login avec profil complet → rediriger vers dashboard
    if (pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_complete')
        .eq('id', user.id)
        .single()

      if (profile?.is_complete) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // is_complete false → laisser sur /login (redirigé vers /onboarding après callback)
    }
    return response
  }

  // Route protégée sans session → /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session existante mais profil incomplet → /onboarding
  // Exception : /onboarding ne doit pas boucler sur lui-même
  if (pathname !== '/onboarding' && !pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_complete')
      .eq('id', user.id)
      .single()

    if (!profile?.is_complete) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     * - _next/static (assets statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - fichiers avec extensions (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

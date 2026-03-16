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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { saveProfilStep } from '@/app/onboarding/actions'
import { createClient } from '@/lib/supabase/client'

const profilSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  phone: z.string().optional(),
})

type ProfilValues = z.infer<typeof profilSchema>

interface StepProfilProps {
  initialProfile: { first_name: string; last_name: string; phone: string }
  onNext: () => void
  isInvited?: boolean
  onComplete?: () => Promise<void>
}

export function StepProfil({ initialProfile, onNext, isInvited, onComplete }: StepProfilProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const form = useForm<ProfilValues>({
    resolver: zodResolver(profilSchema),
    defaultValues: initialProfile,
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar.jpg`, file, { cacheControl: '3600', upsert: true })

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${user.id}/avatar.jpg`)
        setAvatarUrl(publicUrl)
      }
    }
    setUploading(false)
  }

  const onSubmit = async (values: ProfilValues) => {
    const result = await saveProfilStep({ ...values, avatar_url: avatarUrl ?? undefined })
    if ('error' in result) return

    if (isInvited && onComplete) {
      await onComplete()
    } else {
      onNext()
    }
  }

  const firstNameInitial = form.watch('first_name')?.[0]?.toUpperCase() ?? '?'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <h2 className="text-[22px] font-semibold text-zinc-900 leading-snug">
          Votre profil
        </h2>

        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt="Photo de profil" />
            ) : (
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-lg font-semibold">
                {firstNameInitial}
              </AvatarFallback>
            )}
          </Avatar>
          <label className="cursor-pointer">
            <span className="text-sm text-indigo-600 hover:underline">
              {uploading ? 'Upload en cours...' : 'Ajouter une photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom *</FormLabel>
                <FormControl>
                  <Input
                    className="h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom *</FormLabel>
                <FormControl>
                  <Input
                    className="h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  className="h-12 border-zinc-200 hover:border-zinc-300 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
          disabled={form.formState.isSubmitting || uploading}
        >
          {form.formState.isSubmitting ? 'Enregistrement...' : 'Continuer'}
        </Button>
      </form>
    </Form>
  )
}

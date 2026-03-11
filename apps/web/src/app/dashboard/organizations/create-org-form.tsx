'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/** Lowercase, spaces → dashes, strip non-alphanumeric (keep hyphens). */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
}

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .refine(s => /^[a-z0-9-]+$/.test(s), 'Slug: lowercase letters, numbers, hyphens only'),
})

type CreateOrgFormValues = z.infer<typeof createOrgSchema>

const CreateOrgForm = ({
  onSuccess,
  embedded = false,
}: {
  onSuccess?: () => void
  embedded?: boolean
}) => {
  const router = useRouter()
  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', slug: '' },
  })

  const name = form.watch('name')
  useEffect(() => {
    const slug = nameToSlug(name)
    form.setValue('slug', slug, { shouldValidate: name.length > 0 })
  }, [name, form])

  const onSubmit = form.handleSubmit(async values => {
    const { data, error } = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
    })
    if (error) {
      toast.error(error.message ?? 'Failed to create organization')
      return
    }
    toast.success('Organization created')
    form.reset()
    if (data?.id) {
      await authClient.organization.setActive(
        { organizationId: data.id },
        {
          onError: e => {
            toast.error(e?.error?.message ?? 'Failed to set active organization')
          },
        }
      )
    }
    router.refresh()
    onSuccess?.()
  })

  const formContent = (
    <form onSubmit={onSubmit} className='space-y-4'>
      <FieldGroup>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input {...form.register('name')} placeholder='Acme Inc' aria-invalid={!!form.formState.errors.name} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <Input {...form.register('slug')} placeholder='acme-inc' aria-invalid={!!form.formState.errors.slug} />
          <FieldError errors={[form.formState.errors.slug]} />
        </Field>
      </FieldGroup>
      <Button type='submit' disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creating…' : 'Create'}
      </Button>
    </form>
  )

  if (embedded) {
    return formContent
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create organization</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}

export default CreateOrgForm

'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getMePreferences, patchMePreferences } from '@/lib/api/me-preferences-web'
import type { LengthUnit } from '@burn-app/user-preferences'
import { toast } from 'sonner'

export function AccountPreferencesForm() {
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('metric')
  const [heightCmRaw, setHeightCmRaw] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getMePreferences()
        if (!cancelled) {
          setLengthUnit(data.preferences.lengthUnit)
          setHeightCmRaw(
            data.preferences.heightCm != null ? String(data.preferences.heightCm) : ''
          )
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Could not load preferences')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const preferences: { lengthUnit: LengthUnit; heightCm?: number } = { lengthUnit }
      if (heightCmRaw.trim() !== '') {
        const h = Number(heightCmRaw)
        if (!Number.isFinite(h) || h < 40 || h > 272) {
          toast.error('Height must be between 40 and 272 cm.')
          setSaving(false)
          return
        }
        preferences.heightCm = h
      }
      await patchMePreferences({ preferences })
      toast.success('Preferences saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }, [lengthUnit, heightCmRaw])

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading preferences…</p>
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="length-unit">Distance & weight units</Label>
        <Select
          value={lengthUnit}
          onValueChange={(v) => setLengthUnit(v as LengthUnit)}
          disabled={saving}
        >
          <SelectTrigger id="length-unit" className="w-full max-w-xs">
            <SelectValue placeholder="Choose units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="metric">Metric (m, kg)</SelectItem>
            <SelectItem value="imperial">Imperial (ft, lb)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Same setting as the mobile app; changes apply to your account everywhere.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="height-cm">Height (cm)</Label>
        <Input
          id="height-cm"
          type="number"
          min={40}
          max={272}
          step="0.1"
          placeholder="Optional — used for BMI on body assessments"
          value={heightCmRaw}
          onChange={e => setHeightCmRaw(e.target.value)}
          disabled={saving}
          className="max-w-xs"
        />
        <p className="text-muted-foreground text-xs">
          Leave blank if you do not need assessments. Trainers add weight per visit; BMI uses this height.
        </p>
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : 'Save preferences'}
      </Button>
    </div>
  )
}

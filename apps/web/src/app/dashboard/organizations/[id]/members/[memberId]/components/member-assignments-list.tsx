'use client'

import { Fragment, useState, useMemo, useEffect, useCallback } from 'react'

import { useMemberAssignments } from '@/hooks/use-member-assignments'
import { useDietPlans } from '@/hooks/use-diet-plans'
import { useDietPlan } from '@/hooks/use-diet-plan'
import { useUpdateDietPlanAssignment, useDeleteDietPlanAssignment } from '@/hooks/use-diet-plan-assignment-mutations'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MealTimeAssignmentFields } from '@/components/diet-plans/meal-time-assignment-fields'
import { buildMealTimeOverridesPayload, mealTimeFieldMapFromPlanAndOverrides } from '@/lib/helpers/meal-time-assignment'
import { Pencil, Trash2 } from 'lucide-react'

interface MemberAssignmentsListProps {
  memberId: string
  organizationId: string
}

export default function MemberAssignmentsList({
  memberId,
  organizationId,
}: Readonly<MemberAssignmentsListProps>) {
  // --- Query current assignments and related plan metadata ---
  const { assignments, isLoading, error, refetch } = useMemberAssignments(
    memberId,
    organizationId
  )
  const { data: plans } = useDietPlans({ perPage: 100 }, 'nutritionist')
  const updateAssignment = useUpdateDietPlanAssignment()
  const deleteAssignment = useDeleteDietPlanAssignment()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editMealTimesByMealId, setEditMealTimesByMealId] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const editingAssignment = assignments.find(a => a.id === editingId) ?? null
  const { data: editingPlan } = useDietPlan(editingAssignment?.dietPlanId ?? '', 'nutritionist')

  const planNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of plans ?? []) {
      m[p.id] = p.name
    }
    return m
  }, [plans])

  const handleEditMealTimeChange = useCallback((dietPlanMealId: string, value: string) => {
    setEditMealTimesByMealId(prev => ({
      ...prev,
      [dietPlanMealId]: value,
    }))
  }, [])

  const editMealTimeOverrides = useMemo(() => {
    if (!editingPlan?.dietPlanMeals) return undefined
    return buildMealTimeOverridesPayload(editingPlan.dietPlanMeals, editMealTimesByMealId)
  }, [editingPlan?.dietPlanMeals, editMealTimesByMealId])

  const handleStartEdit = (a: { id: string; startDate: string; endDate: string }) => {
    setEditingId(a.id)
    setEditStartDate(a.startDate)
    setEditEndDate(a.endDate)
    setEditMealTimesByMealId({})
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    if (editStartDate > editEndDate) return

    try {
      await updateAssignment.mutateAsync({
        id: editingId,
        startDate: editStartDate,
        endDate: editEndDate,
        mealTimeOverrides: editMealTimeOverrides,
      })
      setEditingId(null)
      refetch()
    } catch {
      // toast handled by mutation
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditMealTimesByMealId({})
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAssignment.mutateAsync(deleteId)
      setDeleteId(null)
      refetch()
    } catch {
      // toast handled
    }
  }

  useEffect(() => {
    if (!editingId || !editingPlan?.dietPlanMeals || !editingAssignment) return
    setEditMealTimesByMealId(
      mealTimeFieldMapFromPlanAndOverrides(editingPlan.dietPlanMeals, editingAssignment.mealTimeOverrides ?? [])
    )
  }, [editingAssignment, editingId, editingPlan?.dietPlanMeals])

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading assignments...</p>
    )
  }
  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }
  if (!assignments.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No diet plan assignments yet. Assign an existing plan or create and assign a new one.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Diet plan</TableHead>
            <TableHead>Start date</TableHead>
            <TableHead>End date</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <Fragment key={a.id}>
            <TableRow>
                <TableCell>
                  {planNameMap[a.dietPlanId] ?? a.dietPlanId}
                </TableCell>
                <TableCell>
                  {editingId === a.id ? (
                    <Input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-36"
                    />
                  ) : (
                    a.startDate
                  )}
                </TableCell>
                <TableCell>
                  {editingId === a.id ? (
                    <Input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-36"
                    />
                  ) : (
                    a.endDate
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {editingId === a.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          disabled={updateAssignment.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(a)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {editingId === a.id && editingPlan?.dietPlanMeals?.length ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="space-y-2 rounded-md border p-3">
                      <p className="text-sm font-medium">Meal times (optional)</p>
                      <MealTimeAssignmentFields
                        meals={editingPlan.dietPlanMeals}
                        valuesByMealId={editMealTimesByMealId}
                        onChange={handleEditMealTimeChange}
                        className="space-y-2"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this diet plan assignment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

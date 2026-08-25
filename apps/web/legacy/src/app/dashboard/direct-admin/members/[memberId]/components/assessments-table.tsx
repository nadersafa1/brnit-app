'use client'

import { useState } from 'react'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoreHorizontal } from 'lucide-react'
import { useDeleteAssessment } from '@/hooks/use-body-composition-assessments'
import type { BodyCompositionAssessment } from '@/hooks/use-body-composition-assessments'

interface AssessmentsTableProps {
  assessments: BodyCompositionAssessment[]
  memberId: string
  onEdit?: (assessment: BodyCompositionAssessment) => void
  onDeleteSuccess?: () => void
  readOnly?: boolean
}

export default function AssessmentsTable({
  assessments,
  memberId,
  onEdit,
  onDeleteSuccess,
  readOnly = false,
}: AssessmentsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<BodyCompositionAssessment | null>(null)
  const deleteMutation = useDeleteAssessment()

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync({ id: deleteTarget.id, memberId })
    setDeleteTarget(null)
    onDeleteSuccess?.()
  }

  if (assessments.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {readOnly ? 'No assessments yet.' : 'No assessments yet. Add one to get started.'}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assessed at</TableHead>
            <TableHead>Weight (kg)</TableHead>
            <TableHead>BMI</TableHead>
            <TableHead>Body fat (%)</TableHead>
            <TableHead>Muscle (kg)</TableHead>
            <TableHead>Visceral fat</TableHead>
            <TableHead>Body water (L)</TableHead>
            <TableHead>Image</TableHead>
            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.map(a => (
            <TableRow key={a.id}>
              <TableCell>
                {new Date(a.assessedAt).toLocaleString()}
              </TableCell>
              <TableCell>{a.weightKg}</TableCell>
              <TableCell>{a.bmi}</TableCell>
              <TableCell>{a.bodyFatPercent}</TableCell>
              <TableCell>{a.muscleMassKg}</TableCell>
              <TableCell>{a.visceralFatAreaCm2}</TableCell>
              <TableCell>{a.bodyWaterL}</TableCell>
              <TableCell>
                {a.imageUrl ? (
                  <a
                    href={a.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(a)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!readOnly && (
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete assessment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this assessment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

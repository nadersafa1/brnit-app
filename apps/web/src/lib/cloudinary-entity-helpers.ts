/**
 * Entity-specific helper for saving an image file to an assessment.
 * Sends form-data PATCH with the file; server uploads to Cloudinary and stores public_id.
 */
export const saveAssessmentImage = async (
  assessmentId: string,
  file: File
): Promise<Response> => {
  const formData = new FormData()
  formData.append('file', file)
  return fetch(`/api/direct-admin/body-composition-assessments/${assessmentId}`, {
    method: 'PATCH',
    body: formData,
  })
}

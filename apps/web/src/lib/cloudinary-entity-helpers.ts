/**
 * Entity-specific helpers for saving Cloudinary uploads to assessments.
 * Use after uploadToCloudinary returns; patches the assessment with the new image URL.
 */
export const saveAssessmentImage = async (
  assessmentId: string,
  secureUrl: string
): Promise<Response> => {
  return fetch(`/api/direct-admin/body-composition-assessments/${assessmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl: secureUrl }),
  })
}

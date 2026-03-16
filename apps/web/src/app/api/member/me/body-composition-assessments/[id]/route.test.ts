import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/api-helpers/member-org', () => ({
  requireMemberOrg: vi.fn(),
}))

vi.mock('@/lib/services/body-composition-assessments', () => ({
  getBodyCompositionAssessmentByIdForMember: vi.fn(),
}))

const mockContext = {
  session: { user: { id: 'u1' }, session: { activeOrganizationId: 'org-1' } },
  organizationId: 'org-1',
  memberId: 'mem-1',
  organization: { id: 'org-1', name: 'Org One' },
}

function request(url: string) {
  return new NextRequest(url)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/member/me/body-composition-assessments/[id]', () => {
  it('returns 400 when orgId is missing', async () => {
    const res = await GET(
      request('http://localhost/api/member/me/body-composition-assessments/assessment-1'),
      params('assessment-1'),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid query parameters')
  })

  it('returns 400 when orgId is empty', async () => {
    const res = await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/assessment-1?orgId=',
      ),
      params('assessment-1'),
    )
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const res = await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/assessment-1?orgId=org-1',
      ),
      params('assessment-1'),
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a member of the org', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json(
        { error: 'Forbidden', code: 'NOT_MEMBER' },
        { status: 403 },
      ),
    })
    const res = await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/assessment-1?orgId=org-1',
      ),
      params('assessment-1'),
    )
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_MEMBER')
  })

  it('returns 404 when assessment not found or not belonging to member', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getBodyCompositionAssessmentByIdForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    vi.mocked(requireMemberOrg).mockResolvedValue({ context: mockContext } as never)
    vi.mocked(getBodyCompositionAssessmentByIdForMember).mockResolvedValue(null)
    const res = await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/other-id?orgId=org-1',
      ),
      params('other-id'),
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Assessment not found')
  })

  it('returns 200 with data when assessment belongs to member', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getBodyCompositionAssessmentByIdForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    const assessment = {
      id: 'assessment-1',
      assessedAt: new Date('2025-01-15'),
      bodyFatPercent: 22,
      weightKg: 75,
      heightCm: 180,
      bmi: 23.1,
      muscleMassKg: 35,
      visceralFatAreaCm2: 80,
      bodyWaterL: 42,
      imageUrl: null,
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
    }
    vi.mocked(requireMemberOrg).mockResolvedValue({ context: mockContext } as never)
    vi.mocked(getBodyCompositionAssessmentByIdForMember).mockResolvedValue(assessment)
    const res = await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/assessment-1?orgId=org-1',
      ),
      params('assessment-1'),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeDefined()
    expect(json.data.id).toBe('assessment-1')
    expect(json.data.bodyFatPercent).toBe(22)
    expect(json.data.organization).toEqual({ id: 'org-1', name: 'Org One' })
  })

  it('passes id and memberId to getBodyCompositionAssessmentByIdForMember', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getBodyCompositionAssessmentByIdForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    vi.mocked(requireMemberOrg).mockResolvedValue({ context: mockContext } as never)
    vi.mocked(getBodyCompositionAssessmentByIdForMember).mockResolvedValue({
      id: 'a1',
      assessedAt: new Date(),
      bodyFatPercent: 20,
      weightKg: 70,
      heightCm: 175,
      bmi: 22.9,
      muscleMassKg: 33,
      visceralFatAreaCm2: 75,
      bodyWaterL: 40,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await GET(
      request(
        'http://localhost/api/member/me/body-composition-assessments/a1?orgId=org-2',
      ),
      params('a1'),
    )
    expect(requireMemberOrg).toHaveBeenCalledWith(expect.any(Headers), {
      orgId: 'org-2',
    })
    expect(getBodyCompositionAssessmentByIdForMember).toHaveBeenCalledWith(
      'a1',
      'mem-1',
    )
  })
})

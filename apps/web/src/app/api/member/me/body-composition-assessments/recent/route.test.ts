import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/api-helpers/member-org', () => ({
  requireMemberOrg: vi.fn(),
}))

vi.mock('@/lib/services/body-composition-assessments', () => ({
  getRecentAssessmentsForMember: vi.fn(),
}))

describe('GET /api/member/me/body-composition-assessments/recent', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent'
    )
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 when no org and no active organization', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json(
        { error: 'Organization context required', code: 'NO_ORGANIZATION' },
        { status: 400 }
      ),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent'
    )
    const response = await GET(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe('NO_ORGANIZATION')
  })

  it('returns 403 when user is not a member of the org', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json(
        { error: 'Forbidden', code: 'NOT_MEMBER' },
        { status: 403 }
      ),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent?orgId=org-1'
    )
    const response = await GET(request)
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.code).toBe('NOT_MEMBER')
  })

  it('returns 400 when limit is out of range', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      context: {
        session: { user: { id: 'u1' }, session: { activeOrganizationId: 'org-1' } },
        organizationId: 'org-1',
        memberId: 'mem-1',
        organization: { id: 'org-1', name: 'Org One' },
      },
    } as never)
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent?limit=99'
    )
    const response = await GET(request)
    expect(response.status).toBe(400)
  })
})

describe('GET recent assessments with valid context', () => {
  const mockContext = {
    session: { user: { id: 'u1' }, session: { activeOrganizationId: 'org-1' } },
    organizationId: 'org-1',
    memberId: 'mem-1',
    organization: { id: 'org-1', name: 'Org One' },
  }

  beforeEach(async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getRecentAssessmentsForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    vi.mocked(requireMemberOrg).mockResolvedValue({ context: mockContext } as never)
    vi.mocked(getRecentAssessmentsForMember).mockResolvedValue({
      organization: { id: 'org-1', name: 'Org One' },
      assessments: [
        {
          id: 'a1',
          assessedAt: new Date('2025-01-15'),
          bodyFatPercent: 22,
          weightKg: 75,
          heightCm: 180,
          bmi: 23.1,
          muscleMassKg: 35,
          visceralFatAreaCm2: 80,
          bodyWaterL: 42,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })
  })

  it('returns 200 with organization and assessments', async () => {
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.organization).toEqual({ id: 'org-1', name: 'Org One' })
    expect(json.assessments).toHaveLength(1)
    expect(json.assessments[0].id).toBe('a1')
    expect(json.assessments[0].bodyFatPercent).toBe(22)
  })

  it('passes orgId and limit to requireMemberOrg and service', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getRecentAssessmentsForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent?orgId=org-2&limit=10'
    )
    await GET(request)
    expect(requireMemberOrg).toHaveBeenCalledWith(
      expect.any(Headers),
      { orgId: 'org-2' }
    )
    expect(getRecentAssessmentsForMember).toHaveBeenCalledWith(
      { orgId: 'org-2', limit: 10 },
      {
        memberId: 'mem-1',
        organizationId: 'org-1',
        organizationName: 'Org One',
      }
    )
  })

  it('returns empty assessments when member has none', async () => {
    const { getRecentAssessmentsForMember } = await import(
      '@/lib/services/body-composition-assessments'
    )
    vi.mocked(getRecentAssessmentsForMember).mockResolvedValue({
      organization: { id: 'org-1', name: 'Org One' },
      assessments: [],
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/body-composition-assessments/recent'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.assessments).toEqual([])
    expect(json.organization).toEqual({ id: 'org-1', name: 'Org One' })
  })
})

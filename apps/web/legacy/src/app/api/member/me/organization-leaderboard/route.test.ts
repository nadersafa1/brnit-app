import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/api-helpers/member-org', () => ({
  requireMemberOrg: vi.fn(),
}))

vi.mock('@/lib/services/organization-leaderboard', () => ({
  getOrganizationLeaderboard: vi.fn(),
}))

describe('GET /api/member/me/organization-leaderboard', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard'
    )
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 when no org context', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json(
        { error: 'Organization context required', code: 'NO_ORGANIZATION' },
        { status: 400 }
      ),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard'
    )
    const response = await GET(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe('NO_ORGANIZATION')
  })

  it('returns 403 when not a member of the org', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    vi.mocked(requireMemberOrg).mockResolvedValue({
      error: NextResponse.json(
        { error: 'Forbidden', code: 'NOT_MEMBER' },
        { status: 403 }
      ),
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard?orgId=other-org'
    )
    const response = await GET(request)
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.code).toBe('NOT_MEMBER')
  })
})

describe('GET organization-leaderboard with valid context', () => {
  const mockContext = {
    session: { user: { id: 'u1' }, session: { activeOrganizationId: 'org-1' } },
    organizationId: 'org-1',
    memberId: 'mem-1',
    organization: { id: 'org-1', name: 'Org One' },
  }

  beforeEach(async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getOrganizationLeaderboard } = await import(
      '@/lib/services/organization-leaderboard'
    )
    vi.mocked(requireMemberOrg).mockResolvedValue({ context: mockContext } as never)
    vi.mocked(getOrganizationLeaderboard).mockResolvedValue({
      organization: { id: 'org-1', name: 'Org One' },
      metric: 'bodyFatPercentPointDrop',
      top: [
        {
          rank: 1,
          memberId: 'mem-2',
          name: 'Alice',
          fatLossPoints: 5.2,
          startBodyFatPercent: 28,
          endBodyFatPercent: 22.8,
          startAssessedAt: new Date('2025-01-01'),
          endAssessedAt: new Date('2025-03-01'),
        },
      ],
      self: {
        rank: 2,
        eligibility: 'eligible',
        fatLossPoints: 3.1,
        startBodyFatPercent: 25,
        endBodyFatPercent: 21.9,
        startAssessedAt: new Date('2025-01-10'),
        endAssessedAt: new Date('2025-03-10'),
      },
    })
  })

  it('returns 200 with organization, metric, top, and self', async () => {
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.organization).toEqual({ id: 'org-1', name: 'Org One' })
    expect(json.metric).toBe('bodyFatPercentPointDrop')
    expect(json.top).toHaveLength(1)
    expect(json.top[0].rank).toBe(1)
    expect(json.top[0].name).toBe('Alice')
    expect(json.top[0].fatLossPoints).toBe(5.2)
    expect(json.self.eligibility).toBe('eligible')
    expect(json.self.rank).toBe(2)
    expect(json.self.fatLossPoints).toBe(3.1)
  })

  it('passes orgId to requireMemberOrg and context to service', async () => {
    const { requireMemberOrg } = await import('@/lib/api-helpers/member-org')
    const { getOrganizationLeaderboard } = await import(
      '@/lib/services/organization-leaderboard'
    )
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard?orgId=org-2'
    )
    await GET(request)
    expect(requireMemberOrg).toHaveBeenCalledWith(
      expect.any(Headers),
      { orgId: 'org-2' }
    )
    expect(getOrganizationLeaderboard).toHaveBeenCalledWith(
      'org-1',
      'Org One',
      'mem-1'
    )
  })

  it('returns self ineligible when member has fewer than 2 assessments', async () => {
    const { getOrganizationLeaderboard } = await import(
      '@/lib/services/organization-leaderboard'
    )
    vi.mocked(getOrganizationLeaderboard).mockResolvedValue({
      organization: { id: 'org-1', name: 'Org One' },
      metric: 'bodyFatPercentPointDrop',
      top: [
        {
          rank: 1,
          memberId: 'mem-2',
          name: 'Alice',
          fatLossPoints: 4,
          startBodyFatPercent: 26,
          endBodyFatPercent: 22,
          startAssessedAt: new Date('2025-01-01'),
          endAssessedAt: new Date('2025-03-01'),
        },
      ],
      self: {
        rank: null,
        eligibility: 'not_enough_assessments',
        fatLossPoints: null,
        startBodyFatPercent: null,
        endBodyFatPercent: null,
        startAssessedAt: null,
        endAssessedAt: null,
      },
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.self.eligibility).toBe('not_enough_assessments')
    expect(json.self.rank).toBeNull()
    expect(json.self.fatLossPoints).toBeNull()
  })

  it('returns empty top when no eligible members', async () => {
    const { getOrganizationLeaderboard } = await import(
      '@/lib/services/organization-leaderboard'
    )
    vi.mocked(getOrganizationLeaderboard).mockResolvedValue({
      organization: { id: 'org-1', name: 'Org One' },
      metric: 'bodyFatPercentPointDrop',
      top: [],
      self: {
        rank: null,
        eligibility: 'not_enough_assessments',
        fatLossPoints: null,
        startBodyFatPercent: null,
        endBodyFatPercent: null,
        startAssessedAt: null,
        endAssessedAt: null,
      },
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/organization-leaderboard'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.top).toEqual([])
  })
})

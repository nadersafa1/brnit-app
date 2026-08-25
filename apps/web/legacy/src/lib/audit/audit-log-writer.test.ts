import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'

import {
  deriveActionName,
  deriveResource,
  deriveOrganizationIdFromRequest,
  extractClientIp,
} from './audit-log-writer'

describe('audit-log-writer derivation helpers', () => {
  it('deriveResource uses the first segment after `/api/`', () => {
    const endpoint = '/api/member/me/food-items/some-id/alternatives'
    expect(deriveResource(endpoint)).toBe('Member')
  })

  it('deriveActionName derives Create/Update/Delete + resource', () => {
    expect(deriveActionName('POST', '/api/admin/food-items')).toBe('CreateAdmin')
    expect(deriveActionName('PATCH', '/api/member/me/profile')).toBe('UpdateMember')
    expect(deriveActionName('DELETE', '/api/nutritionist/meals')).toBe('DeleteNutritionist')
  })

  it('deriveOrganizationIdFromRequest reads orgId query param', () => {
    const req = new NextRequest('http://localhost/api/member/me/x?orgId=org-1')
    expect(deriveOrganizationIdFromRequest(req)).toBe('org-1')
  })

  it('extractClientIp prefers first IP in x-forwarded-for', () => {
    const req = new NextRequest('http://localhost/api/member/me/x', {
      headers: {
        'x-forwarded-for': '203.0.113.10, 203.0.113.11',
      },
    })
    expect(extractClientIp(req)).toBe('203.0.113.10')
  })
})


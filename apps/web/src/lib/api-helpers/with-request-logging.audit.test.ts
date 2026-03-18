import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn()
  const valuesMock = vi.fn().mockResolvedValue(undefined)
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock })
  return { getSessionMock, valuesMock, insertMock }
})

vi.mock('@burn-app/auth', () => ({
  auth: {
    api: {
      getSession: mocks.getSessionMock,
    },
  },
}))

vi.mock('@burn-app/db', () => ({
  db: {
    insert: mocks.insertMock,
  },
}))

import { withRequestLogging } from './with-request-logging'

describe('withRequestLogging audit phase2 (best-effort)', () => {
  const originalAuditEnv = process.env.AUDIT_LOG_DB_ENABLED

  beforeEach(() => {
    mocks.getSessionMock.mockReset()
    mocks.insertMock.mockClear()
    mocks.valuesMock.mockReset()
    mocks.valuesMock.mockResolvedValue(undefined)

    process.env.AUDIT_LOG_DB_ENABLED = 'true'

    mocks.getSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    })
  })

  // Ensure audit logging tests do not leak env into other unit tests.
  afterEach(() => {
    if (originalAuditEnv === undefined) delete process.env.AUDIT_LOG_DB_ENABLED
    else process.env.AUDIT_LOG_DB_ENABLED = originalAuditEnv
  })

  it('does not write audit logs for GET requests', async () => {
    const handler = async () => NextResponse.json({ ok: true }, { status: 200 })
    const wrapped = withRequestLogging(handler)

    const req = new NextRequest('http://localhost/api/member/me/food-items', {
      method: 'GET',
      headers: { 'x-request-id': 'rid-get-1' },
    })

    const res = await wrapped(req as any)
    expect(res.status).toBe(200)

    await new Promise((r) => setTimeout(r, 0))

    expect(mocks.insertMock).not.toHaveBeenCalled()
  })

  it('writes one audit log row for POST success (includes requestId/status/success)', async () => {
    const handler = async () => NextResponse.json({ created: true }, { status: 201 })
    const wrapped = withRequestLogging(handler)

    const req = new NextRequest('http://localhost/api/admin/food-items?orgId=org-1', {
      method: 'POST',
      headers: {
        'x-request-id': 'rid-post-1',
        'user-agent': 'vitest-agent',
        'x-forwarded-for': '203.0.113.10, 203.0.113.11',
      },
    })

    const res = await wrapped(req as any)
    expect(res.status).toBe(201)
    expect(res.headers.get('x-request-id')).toBe('rid-post-1')

    await new Promise((r) => setTimeout(r, 0))

    expect(mocks.insertMock).toHaveBeenCalledTimes(1)
    expect(mocks.valuesMock).toHaveBeenCalledTimes(1)

    const inserted = mocks.valuesMock.mock.calls[0][0]
    expect(inserted.requestId).toBe('rid-post-1')
    expect(inserted.requestMethod).toBe('POST')
    expect(inserted.statusCode).toBe(201)
    expect(inserted.success).toBe(true)
    expect(inserted.organizationId).toBe('org-1')
    expect(inserted.endpoint).toBe('/api/admin/food-items')
    expect(inserted.actionName).toBe('CreateAdmin')
  })

  it('writes one audit log row for POST when handler throws (status 500, success false)', async () => {
    const handler = async () => {
      throw new Error('boom')
    }
    const wrapped = withRequestLogging(handler)

    const req = new NextRequest('http://localhost/api/admin/food-items?orgId=org-2', {
      method: 'POST',
      headers: { 'x-request-id': 'rid-throw-1' },
    })

    const res = await wrapped(req as any)
    expect(res.status).toBe(500)

    await new Promise((r) => setTimeout(r, 0))

    expect(mocks.insertMock).toHaveBeenCalledTimes(1)
    const inserted = mocks.valuesMock.mock.calls[0][0]
    expect(inserted.statusCode).toBe(500)
    expect(inserted.success).toBe(false)
    expect(inserted.requestId).toBe('rid-throw-1')
  })

  it('does not affect API response when audit insert fails (best-effort)', async () => {
    mocks.valuesMock.mockRejectedValueOnce(new Error('db down'))

    const handler = async () => NextResponse.json({ created: true }, { status: 201 })
    const wrapped = withRequestLogging(handler)

    const req = new NextRequest('http://localhost/api/admin/food-items?orgId=org-3', {
      method: 'POST',
      headers: { 'x-request-id': 'rid-fail-1' },
    })

    const res = await wrapped(req as any)
    expect(res.status).toBe(201)

    await new Promise((r) => setTimeout(r, 0))

    expect(mocks.insertMock).toHaveBeenCalledTimes(1)
  })
})


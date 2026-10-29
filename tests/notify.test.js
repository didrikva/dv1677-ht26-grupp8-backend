import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'

vi.mock('../config/broker.js', () => ({
  broker: {
    allocate: vi.fn().mockResolvedValue({ allocation: { id: 'alloc-id', secret: 'alloc-secret' } }),
    withdraw: vi.fn().mockResolvedValue({})
  },
  BrokerError: class BrokerError extends Error {}
}))

vi.mock('../services/notify.js', () => ({
  notifiera: vi.fn()
}))

import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'
import { notifiera } from '../services/notify.js'

let mongoServer
let db
let token
let resource

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_notify_test'
  process.env.JWT_SECRET = 'test-secret'
  db = await openDb()
})

beforeEach(async () => {
  vi.clearAllMocks()
  await db.collection('users').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('resources').deleteMany({})

  await request(app).post('/api/auth/register').send({ email: 'a@b.se', password: 'hemligt' })
  const login = await request(app).post('/api/auth/login').send({ email: 'a@b.se', password: 'hemligt' })
  token = login.body.token

  resource = await db.collection('resources').insertOne({
    name: 'Test resource',
    provider: 'proxmox',
    externalId: 'test-resource'
  })
})

afterAll(async () => {
  await closeDB()
  if (mongoServer) await mongoServer.stop()
})

function bookingBody() {
  return {
    resourceId: String(resource.insertedId),
    startsAt: '2026-01-01T10:00:00.000Z',
    endsAt: '2026-01-02T10:00:00.000Z',
    want: {}
  }
}

describe('Notifications', () => {
  it('notifies when a booking is created', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingBody())
      .expect(201)

    expect(notifiera).toHaveBeenCalledOnce()
    expect(notifiera.mock.calls[0][0]).toBe('Bokning bekräftad')
    expect(notifiera.mock.calls[0][1]).toContain('Test resource')
  })

  it('notifies when a booking is cancelled', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingBody())
      .expect(201)
    vi.clearAllMocks()

    await request(app)
      .delete(`/api/bookings/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(notifiera).toHaveBeenCalledOnce()
    expect(notifiera.mock.calls[0][0]).toBe('Bokning avbokad')
  })

  it('does not notify when the booking is denied', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bookingBody(), resourceId: 'invalid' })
      .expect(400)

    expect(notifiera).not.toHaveBeenCalled()
  })
})

describe('notifiera (real implementation)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not throw when the webhook is down', async () => {
    const { notifiera: real } = await vi.importActual('../services/notify.js')
    process.env.DISCORD_WEBHOOK_URL = 'https://example.invalid/webhook'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(real('Titel', 'Text')).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it('skips silently when the webhook URL is missing', async () => {
    const { notifiera: real } = await vi.importActual('../services/notify.js')
    delete process.env.DISCORD_WEBHOOK_URL
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await real('Titel', 'Text')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

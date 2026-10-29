import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'

vi.mock('../config/broker.js', () => ({
  broker: {
    allocate: vi.fn().mockResolvedValue({ allocation: { id: 'alloc-id', secret: 'alloc-secret' } }),
    withdraw: vi.fn().mockResolvedValue({})
  },
  BrokerError: class BrokerError extends Error {}
}))

vi.mock('../services/notify.js', () => ({ notifiera: vi.fn() }))

import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'

let mongoServer
let db
let token
let resource
let shared

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_overlap_test'
  process.env.JWT_SECRET = 'test-secret'
  db = await openDb()
})

beforeEach(async () => {
  await db.collection('users').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('resources').deleteMany({})

  await request(app).post('/api/auth/register').send({ email: 'a@b.se', password: 'hemligt' })
  const login = await request(app).post('/api/auth/login').send({ email: 'a@b.se', password: 'hemligt' })
  token = login.body.token

  resource = await db.collection('resources').insertOne({
    name: 'Test machine',
    provider: 'maas',
    externalId: 'test-machine'
  })
  shared = await db.collection('resources').insertOne({
    name: 'Test node',
    provider: 'proxmox',
    externalId: 'test-node'
  })
})

afterAll(async () => {
  await closeDB()
  if (mongoServer) await mongoServer.stop()
})

const at = (h) => `2026-01-01T${String(h).padStart(2, '0')}:00:00.000Z`

function book(startH, endH) {
  return request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ resourceId: String(resource.insertedId), startsAt: at(startH), endsAt: at(endH), want: {} })
}

describe('Booking overlap', () => {
  it('leaves overlap on shareable resources (proxmox) to the broker', async () => {
    const bookShared = () => request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: String(shared.insertedId), startsAt: at(10), endsAt: at(12), want: {} })

    await bookShared().expect(201)
    await bookShared().expect(201)
  })

  it('returns 409 with krockarMed for an overlapping booking', async () => {
    const first = await book(10, 12).expect(201)
    const res = await book(11, 13).expect(409)

    expect(res.body.krockarMed).toBe(first.body._id)
  })

  it('allows back-to-back bookings', async () => {
    await book(10, 12).expect(201)
    await book(12, 14).expect(201)
    await book(8, 10).expect(201)
  })

  it('ignores cancelled bookings', async () => {
    const first = await book(10, 12).expect(201)

    await request(app)
      .delete(`/api/bookings/${first.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    await book(10, 12).expect(201)
  })

  it('rejects an end before start with 400', async () => {
    await book(12, 10).expect(400)
  })

  it('returns 409 when an update would overlap, but not with itself', async () => {
    await book(10, 12).expect(201)
    const second = await book(13, 14).expect(201)

    await request(app)
      .put(`/api/bookings/${second.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: at(11), endsAt: at(14) })
      .expect(409)

    await request(app)
      .put(`/api/bookings/${second.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: at(13), endsAt: at(15) })
      .expect(200)
  })
})

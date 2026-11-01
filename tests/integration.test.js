import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'
import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'

let mongoServer
let db
let tokenA
let tokenB
let resourceId

vi.mock('../config/broker.js', () => ({
  broker: {
    allocate: vi.fn().mockResolvedValue({
      allocation: { id: 'integration-allocation', secret: 'integration-secret' }
    }),
    withdraw: vi.fn().mockResolvedValue({})
  },
  BrokerError: class BrokerError extends Error {}
}))

vi.mock('../services/notify.js', () => ({
  notifiera: vi.fn()
}))

async function createUser(email) {
  await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'hemligt' })
    .expect(201)

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'hemligt' })
    .expect(200)

  return response.body.token
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_integration_test'
  process.env.JWT_SECRET = 'test-secret'
  db = await openDb()
})

beforeEach(async () => {
  await db.collection('users').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('resources').deleteMany({})

  tokenA = await createUser('integration-a@test.se')
  tokenB = await createUser('integration-b@test.se')

  const resource = await db.collection('resources').insertOne({
    name: 'Integration test machine',
    provider: 'maas',
    externalId: 'integration-test-machine'
  })
  resourceId = String(resource.insertedId)
})

afterAll(async () => {
  await closeDB()
  if (mongoServer) await mongoServer.stop()
})

function bookingBody(start, end) {
  return {
    resourceId,
    startsAt: start,
    endsAt: end,
    want: {}
  }
}

describe('Booking integration', () => {
  it('creates a booking for an available time', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(bookingBody('2030-10-01T10:00:00.000Z', '2030-10-01T11:00:00.000Z'))
      .expect(201)

    expect(response.body._id).toBeDefined()
    expect(await db.collection('bookings').countDocuments()).toBe(1)
  })

  it('rejects an overlapping booking for the same resource', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(bookingBody('2030-10-01T10:00:00.000Z', '2030-10-01T11:00:00.000Z'))
      .expect(201)

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(bookingBody('2030-10-01T10:30:00.000Z', '2030-10-01T11:30:00.000Z'))
      .expect(409)

    expect(response.body.error).toMatch(/bokad/i)
  })

  it('requires authentication to create a booking', async () => {
    await request(app)
      .post('/api/bookings')
      .send(bookingBody('2030-10-01T10:00:00.000Z', '2030-10-01T11:00:00.000Z'))
      .expect(401)
  })
})

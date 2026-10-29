import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'

vi.mock('../config/broker.js', () => ({
  broker: {
    allocate: vi.fn().mockResolvedValue({
      allocation: {
        id: 'test-allocation-id',
        secret: 'test-secret'
      }
    }),
    withdraw: vi.fn().mockResolvedValue({})
  },
  BrokerError: class BrokerError extends Error {}
}))

import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'

let mongoServer
let db

async function loginAs(email) {
  await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'hemligt' })

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'hemligt' })

  return res.body.token
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()

  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_auth_test'
  process.env.JWT_SECRET = 'test-secret'

  db = await openDb()
})

beforeEach(async () => {
  await db.collection('users').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('resources').deleteMany({})
})

afterAll(async () => {
  await closeDB()

  if (mongoServer) {
    await mongoServer.stop()
  }
})

describe('Auth', () => {
  it('registers and stores a hashed password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.se', password: 'hemligt' })
      .expect(201)

    const user = await db.collection('users').findOne({ email: 'a@b.se' })

    expect(user).not.toBeNull()
    expect(user.password).not.toBe('hemligt')
  })

  it('rejects duplicate email', async () => {
    await loginAs('a@b.se')

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.se', password: 'x' })
      .expect(409)
  })

  it('treats email case-insensitively', async () => {
    await loginAs('a@b.se')

    await request(app)
      .post('/api/auth/register')
      .send({ email: ' A@B.se ', password: 'x' })
      .expect(409)

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'A@B.SE', password: 'hemligt' })
      .expect(200)
  })

  it('gives the same 401 for wrong password and unknown email', async () => {
    await loginAs('a@b.se')

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.se', password: 'fel' })
      .expect(401)

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@b.se', password: 'fel' })
      .expect(401)

    expect(wrongPassword.body).toEqual(unknownUser.body)
  })

  it('returns 401 without token and with invalid token', async () => {
    await request(app)
      .get('/api/bookings/mine')
      .expect(401)

    await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', 'Bearer nonsense')
      .expect(401)
  })
})

describe('Booking ownership', () => {
  it('only lists, updates and deletes own bookings', async () => {
    const tokenA = await loginAs('a@b.se')
    const tokenB = await loginAs('b@b.se')

    const resource = await db.collection('resources').insertOne({
      name: 'Test resource',
      provider: 'proxmox',
      externalId: 'test-resource'
    })

    const body = {
      resourceId: String(resource.insertedId),
      startsAt: '2030-01-01T10:00:00.000Z',
      endsAt: '2030-01-01T12:00:00.000Z',
      want: {}
    }

    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(body)
      .expect(201)

    const bookingId = created.body._id

    expect(bookingId).toBeTruthy()
    expect(created.body).not.toHaveProperty('broker')

    const mineA = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    const mineB = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)

    expect(mineA.body).toHaveLength(1)
    expect(mineB.body).toHaveLength(0)

    await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        startsAt: '2030-02-01T10:00:00.000Z',
        endsAt: '2030-02-01T12:00:00.000Z'
      })
      .expect(404)

    await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404)

    await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    const cancelledBooking = await db.collection('bookings').findOne({
      _id: new ObjectId(bookingId)
    })

    expect(cancelledBooking.status).toBe('cancelled')
  })
})
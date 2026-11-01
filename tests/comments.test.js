import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'
import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'

vi.mock('../config/broker.js', () => ({
  broker: {
    allocate: vi.fn(),
    withdraw: vi.fn()
  },
  BrokerError: class BrokerError extends Error {}
}))

let mongoServer
let db
let userA
let userB
let tokenA
let tokenB
let bookingA
let bookingB
let socketTo
let socketEmit

async function createUser(email) {
  await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'hemligt' })
    .expect(201)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'hemligt' })
    .expect(200)
  const user = await db.collection('users').findOne({ email })

  return { token: login.body.token, user }
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_comments_test'
  process.env.JWT_SECRET = 'test-secret'
  db = await openDb()
})

beforeEach(async () => {
  await db.collection('users').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('comments').deleteMany({})
  await db.collection('resources').deleteMany({})

  const accountA = await createUser('a@b.se')
  const accountB = await createUser('b@b.se')
  userA = accountA.user
  userB = accountB.user
  tokenA = accountA.token
  tokenB = accountB.token

  bookingA = await db.collection('bookings').insertOne({
    bookedBy: String(userA._id)
  })
  bookingB = await db.collection('bookings').insertOne({
    bookedBy: String(userB._id)
  })

  socketEmit = vi.fn()
  socketTo = vi.fn(() => ({ emit: socketEmit }))
  app.set('io', { to: socketTo })
})

afterAll(async () => {
  app.set('io', undefined)
  await closeDB()
  if (mongoServer) await mongoServer.stop()
})

describe('Comments API', () => {
  it('requires authentication for comment routes', async () => {
    await request(app)
      .get(`/api/bookings/${bookingA.insertedId}/comments`)
      .expect(401)

    await request(app)
      .post(`/api/bookings/${bookingA.insertedId}/comments`)
      .send({ text: 'Kommentar' })
      .expect(401)

    await request(app)
      .delete(`/api/comments/${new ObjectId()}`)
      .expect(401)
  })

  it('creates a trimmed comment for the owner and emits it to the booking room', async () => {
    const response = await request(app)
      .post(`/api/bookings/${bookingA.insertedId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ text: '  Hej!  ' })
      .expect(201)

    expect(response.body.text).toBe('Hej!')
    expect(response.body.author).toBe(String(userA._id))
    expect(response.body.bookingId).toBe(String(bookingA.insertedId))
    expect(await db.collection('comments').countDocuments()).toBe(1)
    expect(socketTo).toHaveBeenCalledWith(`booking:${bookingA.insertedId}`)
    expect(socketEmit).toHaveBeenCalledWith(
      'comment:created',
      expect.objectContaining({
        _id: new ObjectId(response.body._id),
        bookingId: bookingA.insertedId,
        author: String(userA._id),
        text: 'Hej!'
      })
    )
  })

  it('rejects invalid booking IDs and empty comment text', async () => {
    await request(app)
      .post('/api/bookings/not-an-id/comments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ text: 'Kommentar' })
      .expect(400)

    await request(app)
      .post(`/api/bookings/${bookingA.insertedId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ text: '   ' })
      .expect(400)
  })

  it('does not allow commenting on another user’s booking', async () => {
    await request(app)
      .post(`/api/bookings/${bookingB.insertedId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ text: 'Kommentar' })
      .expect(404)
  })

  it('lists comments in chronological order only for the booking owner', async () => {
    await db.collection('comments').insertMany([
      {
        bookingId: bookingA.insertedId,
        author: String(userA._id),
        text: 'Senare',
        createdAt: new Date('2026-01-02T00:00:00.000Z')
      },
      {
        bookingId: bookingA.insertedId,
        author: String(userA._id),
        text: 'Tidigare',
        createdAt: new Date('2026-01-01T00:00:00.000Z')
      },
      {
        bookingId: bookingB.insertedId,
        author: String(userB._id),
        text: 'Annan bokning',
        createdAt: new Date('2026-01-01T00:00:00.000Z')
      }
    ])

    const response = await request(app)
      .get(`/api/bookings/${bookingA.insertedId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    expect(response.body.map(comment => comment.text)).toEqual(['Tidigare', 'Senare'])
  })

  it('rejects invalid IDs and hides comments for bookings owned by others', async () => {
    await request(app)
      .get('/api/bookings/not-an-id/comments')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400)

    await request(app)
      .get(`/api/bookings/${bookingB.insertedId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404)
  })

  it('deletes the author’s comment and emits its ID to the booking room', async () => {
    const comment = await db.collection('comments').insertOne({
      bookingId: bookingA.insertedId,
      author: String(userA._id),
      text: 'Ta bort',
      createdAt: new Date()
    })

    await request(app)
      .delete(`/api/comments/${comment.insertedId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200, { message: 'Comment deleted' })

    expect(await db.collection('comments').findOne({ _id: comment.insertedId })).toBeNull()
    expect(socketTo).toHaveBeenCalledWith(`booking:${bookingA.insertedId}`)
    expect(socketEmit).toHaveBeenCalledWith('comment:deleted', String(comment.insertedId))
  })

  it('does not delete a comment if its booking is no longer owned by the author', async () => {
    const comment = await db.collection('comments').insertOne({
      bookingId: bookingA.insertedId,
      author: String(userA._id),
      text: 'Inte längre behörig',
      createdAt: new Date()
    })
    await db.collection('bookings').updateOne(
      { _id: bookingA.insertedId },
      { $set: { bookedBy: String(userB._id) } }
    )

    await request(app)
      .delete(`/api/comments/${comment.insertedId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403)

    expect(await db.collection('comments').findOne({ _id: comment.insertedId })).not.toBeNull()
  })
})

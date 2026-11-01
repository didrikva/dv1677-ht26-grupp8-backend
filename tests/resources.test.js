import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'
import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'
import resourceModel from '../models/resources.js'
import { resources as resourceController } from '../controllers/resources.js'

let mongoServer
let db
let token

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_test'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
  db = await openDb()
})

beforeEach(async () => {
  await db.collection('resources').deleteMany({})
  await db.collection('bookings').deleteMany({})
  await db.collection('users').deleteMany({})

  await request(app).post('/api/auth/register').send({ email: 'a@b.se', password: 'hemligt' })
  const login = await request(app).post('/api/auth/login').send({ email: 'a@b.se', password: 'hemligt' })
  token = login.body.token
})

afterAll(async () => {
  await closeDB()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Resources API', () => {
  it('returns an empty JSON array when there are no resources', async () => {
    const response = await request(app)
      .get('/api/resources')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toEqual([])
  })

  it('returns all resources', async () => {
    await db.collection('resources').insertMany([
      { name: 'Server A', type: 'server' },
      { name: 'Server B', type: 'server' }
    ])

    const response = await request(app)
      .get('/api/resources')
      .expect(200)

    expect(response.body.map(resource => resource.name)).toEqual(['Server A', 'Server B'])
  })

  it('creates a resource', async () => {
    const response = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Testserver',
        type: 'server',
        description: 'Test resource',
        capacity: 2
      })
      .expect(201)

    expect(response.body.lastID).toBeDefined()
  })

  it('creates a resource with the default capacity', async () => {
    const response = await request(app)
      .post('/api/resources')
      .send({ name: 'Default capacity server', type: 'server' })
      .expect(201)

    const resource = await db.collection('resources').findOne({
      _id: new ObjectId(response.body.lastID)
    })
    expect(resource).toMatchObject({
      name: 'Default capacity server',
      type: 'server',
      capacity: 1
    })
  })

  describe('Resource controller errors', () => {
    it('passes model errors to Express error handling', async () => {
      const error = new Error('Database error')
      const next = vi.fn()
      const validId = new ObjectId().toString()

      vi.spyOn(resourceModel, 'getAll').mockRejectedValueOnce(error)
      await resourceController.getAll({}, {}, next)
      expect(next).toHaveBeenLastCalledWith(error)

      vi.spyOn(resourceModel, 'getOne').mockRejectedValueOnce(error)
      await resourceController.getOne({ params: { id: validId } }, {}, next)
      expect(next).toHaveBeenLastCalledWith(error)

      vi.spyOn(resourceModel, 'addOne').mockRejectedValueOnce(error)
      await resourceController.addOne({ body: {} }, {}, next)
      expect(next).toHaveBeenLastCalledWith(error)

      vi.spyOn(resourceModel, 'deleteOne').mockRejectedValueOnce(error)
      await resourceController.deleteOne({ params: { id: validId } }, {}, next)
      expect(next).toHaveBeenLastCalledWith(error)

      vi.spyOn(resourceModel, 'updateOne').mockRejectedValueOnce(error)
      await resourceController.updateOne(
        { params: { id: validId }, body: {} },
        {},
        next
      )
      expect(next).toHaveBeenLastCalledWith(error)
    })
  })

  it('returns a resource and its bookings by id', async () => {
    const created = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Testserver',
        type: 'server',
        description: 'Test resource',
        capacity: 2
      })
      .expect(201)

    const response = await request(app)
      .get(`/api/resources/${created.body.lastID}`)
      .expect(200)

    expect(response.body.resource.name).toBe('Testserver')
    expect(response.body.bookings).toEqual([])
  })

  it('returns the bookings associated with a resource', async () => {
    const resourceId = new ObjectId()
    const booking = {
      resourceId,
      bookedBy: 'test-user',
      status: 'confirmed'
    }
    await db.collection('resources').insertOne({
      _id: resourceId,
      name: 'Booked server',
      type: 'server'
    })
    await db.collection('bookings').insertOne(booking)

    const response = await request(app)
      .get(`/api/resources/${resourceId}`)
      .expect(200)

    expect(response.body.bookings).toHaveLength(1)
    expect(response.body.bookings[0].bookedBy).toBe('test-user')
  })

  it('rejects invalid IDs and returns 404 for a missing resource', async () => {
    await request(app)
      .get('/api/resources/not-an-id')
      .expect(400, { error: 'Invalid resource ID' })

    await request(app)
      .get(`/api/resources/${new ObjectId()}`)
      .expect(404, { error: 'Resource not found' })
  })

  it('updates a resource and defaults an empty capacity to one', async () => {
    const inserted = await db.collection('resources').insertOne({
      name: 'Old name',
      type: 'server',
      description: 'Old description',
      capacity: 5
    })

    await request(app)
      .put(`/api/resources/${inserted.insertedId}`)
      .send({
        name: 'Updated name',
        type: 'vm',
        description: 'Updated description',
        capacity: 0
      })
      .expect(200, { changes: 1 })

    const updated = await db.collection('resources').findOne({ _id: inserted.insertedId })
    expect(updated).toMatchObject({
      name: 'Updated name',
      type: 'vm',
      description: 'Updated description',
      capacity: 1
    })
  })
})
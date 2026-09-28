import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import { closeDB, openDb } from '../db/database.js'

let mongoServer
let db

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.DB_NAME = 'jsramverk_test'
  db = await openDb()
})

beforeEach(async () => {
  await db.collection('resources').deleteMany({})
  await db.collection('bookings').deleteMany({})
})

afterAll(async () => {
  await closeDB()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

describe('Resources API', () => {
  it('returns an empty JSON array when there are no resources', async () => {
    const response = await request(app)
      .get('/resources')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toEqual([])
  })

  it('creates a resource', async () => {
    const response = await request(app)
      .post('/resources')
      .send({
        name: 'Testserver',
        type: 'server',
        description: 'Test resource',
        capacity: 2
      })
      .expect(201)

    expect(response.body.lastID).toBeDefined()
  })

  it('returns a resource and its bookings by id', async () => {
    const created = await request(app)
      .post('/resources')
      .send({
        name: 'Testserver',
        type: 'server',
        description: 'Test resource',
        capacity: 2
      })
      .expect(201)

    const response = await request(app)
      .get(`/resources/${created.body.lastID}`)
      .expect(200)

    expect(response.body.resource.name).toBe('Testserver')
    expect(response.body.bookings).toEqual([])
  })
})
import bcrypt from 'bcryptjs'
import { openDb, closeDB } from '../db/database.js'

const db = await openDb(process.env.MONGODB_URI || 'mongodb://localhost:27017', process.env.DB_NAME || 'resource_booking')

await db.collection('resources').deleteMany({})
await db.collection('users').deleteMany({})

const resourcesResult = await db.collection('resources').insertMany([
  { name: 'Proxmox Node 1', type: 'proxmox', description: '24 vCPU, 128 GB RAM', active: true, createdAt: new Date() },
  { name: 'Proxmox Node 2', type: 'proxmox', description: '16 vCPU, 64 GB RAM', active: true, createdAt: new Date() },
  { name: 'MAAS Machine 1', type: 'maas', description: 'Bare metal, 8 core', active: true, createdAt: new Date() },
  { name: 'OpenStack Slice A', type: 'openstack', description: '4 vCPU, 16 GB RAM', active: true, createdAt: new Date() },
])

await db.collection('bookings').insertMany([
  {
    resource_id: resourcesResult.insertedIds[0],
    user: 'anna@student.bth.se',
    start_time: '2026-09-15 08:00',
    end_time: '2026-09-15 12:00',
    status: 'confirmed'
  },
  {
    resource_id: resourcesResult.insertedIds[1],
    user: 'erik@student.bth.se',
    start_time: '2026-09-15 13:00',
    end_time: '2026-09-15 17:00',
    status: 'confirmed'
  }
])

const hash = await bcrypt.hash('password123', 10)

await db.collection('users').insertMany([
  { email: 'student@example.com', passwordHash: hash, role: 'student', createdAt: new Date() },
  { email: 'admin@example.com', passwordHash: hash, role: 'admin', createdAt: new Date() },
])

console.log('Seed done: 4 resources, 2 bookings, 2 users (password: password123)')
await closeDB()
import { openDb } from '../db/database.js'
import { syncResources } from '../domain/syncResources.js'

try {
  await openDb()
  await syncResources()
  console.log('Resources synchronized successfully')
} catch (err) {
  console.error('Resource synchronization failed:', err)
  process.exitCode = 1
}
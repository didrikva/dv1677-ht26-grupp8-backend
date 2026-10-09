import { getDB } from '../db/database.js'
import { broker } from '../config/broker.js'

export async function syncResources() {
  const db = getDB()
  const sources = { proxmox: 'nodes', maas: 'machines', openstack: 'projects' }

  for (const [provider, key] of Object.entries(sources)) {
    const inventory = await broker.inventory(provider)
    for (const r of inventory[key] ?? []) {
      await db.collection('resources').updateOne(
        { provider, externalId: r.id },
        { $set: { name: r.name, capacity: r.capacity, active: true } },
        { upsert: true },
      )
    }
  }
}
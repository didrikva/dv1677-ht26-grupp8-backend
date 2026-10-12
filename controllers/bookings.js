import { ObjectId } from 'mongodb'
import { openDb } from '../db/database.js';
import { broker, BrokerError } from '../config/broker.js'

export async function createBooking(req, res) {
  const { resourceId, startsAt, endsAt, want } = req.body
  const db = await openDb()

  const resource = await db.collection('resources').findOne({ _id: new ObjectId(resourceId) })
  if (!resource) return res.status(404).json({ error: 'Resource not found' })

  const bookingId = new ObjectId()
  const user = String(req.user._id)
  const payload = resource.provider === 'maas'
    ? { systemId: resource.externalId, user, startsAt, endsAt, idempotencyKey: String(bookingId) }
    : { want, user, startsAt, endsAt, idempotencyKey: String(bookingId) }

  try {
    const { allocation } = await broker.allocate(resource.provider, payload)

    const booking = {
      _id: bookingId, resourceId: resource._id, bookedBy: req.user._id,
      startsAt: new Date(startsAt), endsAt: new Date(endsAt), status: 'confirmed',
    }
    await db.collection('bookings').insertOne({
      ...booking,
      broker: { allocationId: allocation.id, secret: allocation.secret },
    })
    return res.status(201).json(booking)   // secret finns bara i databasen, aldrig i svaret
  } catch (err) {
    if (!(err instanceof BrokerError)) throw err
    if (err.status === 409) return res.status(409).json({ error: 'Booking denied', code: err.code })
    return res.status(503).json({ error: 'Booking service unavailable', code: err.code })
  }
}

export async function cancelBooking(req, res) {
  const db = await openDb()
  const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) })
  if (!booking) return res.status(404).json({ error: 'Not found' })
  // (kontrollera behörighet precis som i era övriga routes)

  const resource = await db.collection('resources').findOne({ _id: booking.resourceId })

  if (booking.broker?.secret) {
    try {
      await broker.withdraw(resource.provider, booking.broker.allocationId, booking.broker.secret)
    } catch (err) {
      if (!(err instanceof BrokerError)) throw err
      return res.status(503).json({ error: 'Could not cancel at provider', code: err.code })
    }
  }

  await db.collection('bookings').updateOne({ _id: booking._id }, { $set: { status: 'cancelled' } })
  res.json({ message: 'Booking cancelled' })
}
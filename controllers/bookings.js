import { ObjectId } from 'mongodb'
import { openDb } from '../db/database.js';
import { broker, BrokerError } from '../config/broker.js'

export async function createBooking(req, res) {
  const resourceId = req.body.resourceId ?? req.body.resource_id
  const startsAt = req.body.startsAt ?? req.body.start_time
  const endsAt = req.body.endsAt ?? req.body.end_time
  const { want } = req.body
  const db = await openDb()
  let resource

  try {
    resource = await db.collection('resources').findOne({
      _id: new ObjectId(resourceId)
    })
  } catch {
    return res.status(400).json({ error: 'Invalid resource ID' })
  }

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' })
  }
  const provider = resource.provider ?? resource.type

  if (!provider) {
    return res.status(400).json({
      error: 'Resource has no provider or type'
    })
  }

  const bookingId = new ObjectId()
  const user = String(req.user._id)
  const payload = provider === 'maas'
    ? {
        systemId: resource.externalId,
        user,
        startsAt,
        endsAt,
        idempotencyKey: String(bookingId)
      }
    : {
        want,
        user,
        startsAt,
        endsAt,
        idempotencyKey: String(bookingId)
      }

  try {
    const { allocation } = await broker.allocate(provider, payload)

    const booking = {
        _id: bookingId,
        resourceId: resource._id,
        bookedBy: req.user._id,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        status: 'confirmed'
      }
      const bookingDocument = {
    ...booking,
    broker: {
      allocationId: allocation.id,
      secret: allocation.secret
    }
  }

  await db.collection('bookings').insertOne(bookingDocument)

  // Skicka till alla som tittar på den här resursen
  if (req.io) {
    req.io
      .to(`resource:${String(resource._id)}`)
      .emit('booking:created', booking)
  }

  return res.status(201).json(booking)
  } catch (err) {
    if (!(err instanceof BrokerError)) throw err

    if (err.status === 409) {
      return res.status(409).json({
        error: 'Booking denied',
        code: err.code
      })
    }

    return res.status(503).json({
      error: 'Booking service unavailable',
      code: err.code
    })
  }
}

export async function cancelBooking(req, res) {
  const db = await openDb()

  let bookingId

  try {
    bookingId = new ObjectId(req.params.id)
  } catch {
    return res.status(404).json({ error: 'Not found' })
  }

  // Hitta endast bokningar som tillhör den inloggade användaren
  const booking = await db.collection('bookings').findOne({
    _id: bookingId,
    bookedBy: req.user._id
  })

  if (!booking) {
    return res.status(404).json({ error: 'Not found' })
  }

  const resource = await db.collection('resources').findOne({
    _id: booking.resourceId
  })

  if (booking.broker?.secret) {
    try {
      const provider = resource?.provider ?? resource?.type

      if (!provider) {
        return res.status(400).json({
          error: 'Resource has no provider or type'
        })
      }

      await broker.withdraw(
        provider,
        booking.broker.allocationId,
        booking.broker.secret
      )
    } catch (err) {
      if (!(err instanceof BrokerError)) throw err

      return res.status(503).json({
        error: 'Could not cancel at provider',
        code: err.code
      })
    }
  }

  await db.collection('bookings').updateOne(
    {
      _id: booking._id,
      bookedBy: req.user._id
    },
    {
      $set: { status: 'cancelled' }
    }
  )

  return res.json({ message: 'Booking cancelled' })
}

export async function getMyBookings(req, res) {
  const db = await openDb()

  const bookings = await db.collection('bookings')
    .find({ bookedBy: req.user._id })
    .toArray()
  console.log('JWT user:', req.user)
  console.log('User ID type:', typeof req.user._id)

  return res.json(bookings)
}

export async function updateBooking(req, res) {
  const db = await openDb()

  let bookingId

  try {
    bookingId = new ObjectId(req.params.id)
  } catch {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const booking = await db.collection('bookings').findOne({
    _id: bookingId,
    bookedBy: req.user._id
  })

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const allowedFields = ['startsAt', 'endsAt']
  const updates = {}

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = new Date(req.body[field])
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  await db.collection('bookings').updateOne(
    { _id: bookingId, bookedBy: req.user._id },
    { $set: updates }
  )

  const updatedBooking = await db.collection('bookings').findOne({
    _id: bookingId,
    bookedBy: req.user._id
  })

  return res.json(updatedBooking)
}
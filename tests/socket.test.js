import 'dotenv/config'
import { expect, it } from 'vitest'
import { io as Client } from 'socket.io-client'

const url = 'https://dv1677-laforge.nplab.bth.se'
const token = process.env.TEST_TOKEN
const bookingId = process.env.TEST_BOOKING_ID

it.skipIf(!token || !bookingId)(
  'skickar kommentarshändelser till andra klienter',
  async () => {
    const a = Client(url, { transports: ['polling'], auth: { token } })
    const b = Client(url, { transports: ['polling'], auth: { token } })

    try {
      await Promise.all([
        new Promise(resolve => a.on('connect', resolve)),
        new Promise(resolve => b.on('connect', resolve))
      ])

      await Promise.all([
        new Promise(resolve => a.emit('join:booking', bookingId, resolve)),
        new Promise(resolve => b.emit('join:booking', bookingId, resolve))
      ])

      const created = new Promise(resolve => b.once('comment:created', resolve))

      const response = await fetch(`${url}/api/bookings/${bookingId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: 'Socket-test' })
      })

      expect(response.status).toBe(201)

      const comment = await response.json()
      expect((await created)._id).toBe(comment._id)

      const deleted = new Promise(resolve => b.once('comment:deleted', resolve))

      const deleteResponse = await fetch(`${url}/api/comments/${comment._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(deleteResponse.ok).toBe(true)
      expect(await deleted).toBe(comment._id)

    } finally {
      a.disconnect()
      b.disconnect()
    }
  },
  30000
)
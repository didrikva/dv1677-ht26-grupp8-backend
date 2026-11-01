import { expect, it } from 'vitest'
import { io as Client } from 'socket.io-client'

const url = 'https://dv1677-laforge.nplab.bth.se'
const token = process.env.TEST_TOKEN
const bookingId = process.env.TEST_BOOKING_ID

it('skickar uppdateringar när kommentarer skapas och tas bort', async () => {
  const a = Client(url, {
    transports: ['polling'],
    auth: { token }
  })

  const b = Client(url, {
    transports: ['polling'],
    auth: { token }
  })

  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        a.on('connect', resolve)
        a.on('connect_error', reject)
      }),
      new Promise((resolve, reject) => {
        b.on('connect', resolve)
        b.on('connect_error', reject)
      })
    ])
    await Promise.all([
      new Promise(resolve => {
        a.emit('join:booking', bookingId, resolve)
      }),
      new Promise(resolve => {
        b.emit('join:booking', bookingId, resolve)
      })
    ])
    const created = new Promise(resolve => {
      b.once('comment:created', resolve)
    })
    const response = await fetch(`${url}/api/bookings/${bookingId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text: 'Testkommentar' })
    })

    expect(response.status).toBe(201)

    const comment = await response.json()
    const receivedComment = await created

    expect(receivedComment._id).toBe(comment._id)

    const deleted = new Promise(resolve => {
      b.once('comment:deleted', resolve)
    })

    const deleteResponse = await fetch(`${url}/api/comments/${comment._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    expect(deleteResponse.ok).toBe(true)

    const deletedId = await deleted

    expect(deletedId).toBe(comment._id)

  } finally {
    a.disconnect()
    b.disconnect()
  }
}, 15000)
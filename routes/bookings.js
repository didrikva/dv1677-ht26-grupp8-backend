import express from 'express'
import { createBooking, cancelBooking, getMyBookings, updateBooking } from '../controllers/bookings.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router();

router.post('/api/bookings', requireAuth, createBooking)
router.get('/api/bookings/mine', requireAuth, getMyBookings)
router.put('/api/bookings/:id', requireAuth, updateBooking)
router.delete('/api/bookings/:id', requireAuth, cancelBooking)

export default router
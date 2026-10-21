import express from 'express'
import { createBooking, cancelBooking } from '../controllers/bookings.js'
// import { jwtMiddleware } from '../middleware/jwt-middleware.js'

const router = express.Router();

router.post('/api/bookings', createBooking);
router.delete('/api/bookings/:id', cancelBooking);

export default router
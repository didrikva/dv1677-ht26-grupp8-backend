import express from 'express'
import { createBooking, cancelBooking } from '../controller/bookings.js'
// import { jwtMiddleware } from '../middleware/jwt-middleware.js'

const router = express.Router();

router.post('/v1/bookings', createBooking);
router.delete('/v1/bookings/:id', cancelBooking);

module.exports = router;
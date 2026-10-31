import express from 'express'
import { createComment, getMyComments, deleteComment } from '../controllers/comments.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router();

router.post('/bookings/:bookingId/comments', requireAuth, createComment)
router.get('/bookings/:bookingId/comments', requireAuth, getMyComments)
router.delete('/comments/:id', requireAuth, deleteComment)

export default router
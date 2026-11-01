import express from 'express'
import { resources } from '../controllers/resources.js';
import { getAvailability } from '../controllers/bookings.js';
// import { jwtMiddleware } from '../middleware/jwt-middleware.js'

const router = express.Router();

router.get('/api/resources', resources.getAll);
router.get('/api/resources/:id', resources.getOne);
router.get('/api/resources/:id/availability', getAvailability);
router.post('/api/resources', resources.addOne);
router.delete('/api/resources/:id', resources.deleteOne);
router.put('/api/resources/:id', resources.updateOne);

export default router
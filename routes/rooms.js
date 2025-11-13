const express = require('express');
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');
const { cache, clearCache } = require('../middleware/cache'); // <-- NY IMPORT

const router = express.Router();

// Public routes med caching
router.get('/', cache(600), getRooms); // Cache i 10 minuter
router.get('/:id', cache(300), getRoom); // Cache i 5 minuter

// Admin only routes - rensa cache vid ändringar
router.post('/', protect, authorize('admin'), clearCache('/api/rooms*'), createRoom);
router.put('/:id', protect, authorize('admin'), clearCache('/api/rooms*'), updateRoom);
router.delete('/:id', protect, authorize('admin'), clearCache('/api/rooms*'), deleteRoom);

module.exports = router;
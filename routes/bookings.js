const express = require('express');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Alla routes kräver inloggning
router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
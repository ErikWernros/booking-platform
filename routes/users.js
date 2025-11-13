const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Alla routes kräver admin-behörighet
router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.get('/stats/overview', getUserStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
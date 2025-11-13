const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Hämta alla användare (med paginering)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta specifik användare med deras bokningar
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Användaren hittades inte'
      });
    }

    // Hämta användarens bokningar
    const bookings = await Booking.find({ userId: req.params.id })
      .populate('roomId', 'name type')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      data: {
        user,
        bookings: {
          count: bookings.length,
          data: bookings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Uppdatera användare
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { username, email, role } = req.body;

    // Förhindra att admin uppdaterar sitt eget lösenord via denna route
    const updateData = { username, email, role };
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Användaren hittades inte'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ta bort användare
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Användaren hittades inte'
      });
    }

    // Förhindra att admin tar bort sig själv
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Du kan inte ta bort ditt eget konto'
      });
    }

    // Ta bort användarens bokningar först
    await Booking.deleteMany({ userId: req.params.id });

    // Ta sedan bort användaren
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Användaren och deras bokningar har tagits bort'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta användarstatistik
// @route   GET /api/users/stats/overview
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' });
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalRegularUsers,
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};
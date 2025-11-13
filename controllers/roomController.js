const Room = require('../models/Room');

// @desc    Hämta alla rum
// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta ett specifikt rum
// @route   GET /api/rooms/:id
// @access  Public
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Rummet hittades inte'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Skapa nytt rum
// @route   POST /api/rooms
// @access  Private/Admin
exports.createRoom = async (req, res, next) => {
  try {
    const { name, capacity, type, description, amenities, hourlyRate } = req.body;

    // Validera required fields
    if (!name || !capacity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Namn, kapacitet och typ är obligatoriska fält'
      });
    }

    const room = await Room.create({
      name,
      capacity,
      type,
      description,
      amenities: amenities || [],
      hourlyRate: hourlyRate || 0
    });

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Uppdatera rum
// @route   PUT /api/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res, next) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Rummet hittades inte'
      });
    }

    room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ta bort rum
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Rummet hittades inte'
      });
    }

    // Soft delete - sätt isActive till false istället för att radera
    await Room.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Rummet har tagits bort'
    });
  } catch (error) {
    next(error);
  }
};
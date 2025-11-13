const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { bookingLogger } = require('../middleware/logger');

// @desc    Skapa ny bokning
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { roomId, startTime, endTime, purpose, numberOfParticipants } = req.body;
    const userId = req.user.id;

    console.log('Creating booking for user:', userId, 'room:', roomId);

    // Validera input
    if (!roomId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Rum, starttid och sluttid är obligatoriska'
      });
    }

    // Konvertera till Date objekt
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Validera datum
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Sluttid måste vara efter starttid'
      });
    }

    if (start < now) {
      return res.status(400).json({
        success: false,
        message: 'Kan inte boka i det förflutna'
      });
    }

    // Kontrollera att rummet finns och är aktivt
    const room = await Room.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Rummet hittades inte eller är inte tillgängligt'
      });
    }

    // Kontrollera kapacitet
    if (numberOfParticipants && numberOfParticipants > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Antal deltagere (${numberOfParticipants}) överstiger rummets kapacitet (${room.capacity})`
      });
    }

    // Kontrollera ledighet
    const isAvailable = await Booking.isRoomAvailable(roomId, start, end);
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        message: 'Rummet är redan bokat under den angivna tiden'
      });
    }

    // Skapa bokningen
    const booking = await Booking.create({
      roomId,
      userId,
      startTime: start,
      endTime: end,
      purpose,
      numberOfParticipants: numberOfParticipants || 1
    });

    // Populera med ruminformation
    await booking.populate('roomId', 'name capacity type');

    // ==================== LOGGNING ====================
    bookingLogger('CREATED', {
      roomId: roomId,
      roomName: room.name,
      startTime: start,
      endTime: end,
      purpose: purpose,
      numberOfParticipants: numberOfParticipants || 1
    }, req.user);
    // ==================== SLUT LOGGNING ====================

    // ==================== SOCKET.IO NOTISER ====================
    const io = req.app.get('io');

    // Notis till admin
    io.to('admin-channel').emit('booking-created', {
      type: 'booking_created',
      message: 'Ny bokning skapad',
      booking: {
        id: booking._id,
        room: booking.roomId.name,
        user: req.user.username,
        startTime: booking.startTime,
        endTime: booking.endTime
      },
      timestamp: new Date()
    });

    // Notis till rummets kanal
    io.to(`room-${roomId}`).emit('booking-updated', {
      type: 'room_booking_updated',
      message: 'Rummet har en ny bokning',
      room: {
        roomId: roomId,
        roomName: booking.roomId.name
      },
      timestamp: new Date()
    });

    // Allmän notis
    io.emit('booking-created', {
      type: 'booking_created',
      message: 'Ny bokning skapad',
      booking: {
        id: booking._id,
        room: booking.roomId.name
      },
      timestamp: new Date()
    });
    // ==================== SLUT SOCKET.IO ====================

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta alla bokningar
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let bookings;
    
    if (req.user.role === 'admin') {
      // Admin ser alla bokningar
      bookings = await Booking.find()
        .populate('roomId', 'name capacity type')
        .populate('userId', 'username email')
        .sort({ startTime: -1 });
    } else {
      // Vanliga användare ser endast sina egna bokningar
      bookings = await Booking.find({ userId: req.user.id })
        .populate('roomId', 'name capacity type')
        .sort({ startTime: -1 });
    }

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta en specifik bokning
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'name capacity type')
      .populate('userId', 'username email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bokningen hittades inte'
      });
    }

    // Kontrollera behörighet
    if (req.user.role !== 'admin' && booking.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Du har inte behörighet att se denna bokning'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Uppdatera bokning
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bokningen hittades inte'
      });
    }

    // Kontrollera behörighet
    if (req.user.role !== 'admin' && booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Du har inte behörighet att uppdatera denna bokning'
      });
    }

    const { roomId, startTime, endTime, purpose, numberOfParticipants } = req.body;

    // Validera nya tider om de uppdateras
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : booking.startTime;
      const end = endTime ? new Date(endTime) : booking.endTime;

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Sluttid måste vara efter starttid'
        });
      }

      // Kontrollera ledighet med exkludering av aktuell bokning
      const room = roomId || booking.roomId;
      const isAvailable = await Booking.isRoomAvailable(room, start, end, req.params.id);
      
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          message: 'Rummet är redan bokat under den angivna tiden'
        });
      }
    }

    // Uppdatera bokningen
    booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('roomId', 'name capacity type');

    // ==================== SOCKET.IO NOTISER ====================
    const io = req.app.get('io');

    // Allmän notis
    io.emit('booking-updated', {
      type: 'booking_updated', 
      message: 'Bokning uppdaterad',
      booking: {
        id: booking._id,
        room: booking.roomId.name
      },
      timestamp: new Date()
    });

    // Notis till admin
    io.to('admin-channel').emit('booking-updated', {
      type: 'booking_updated',
      message: 'Bokning uppdaterad',
      booking: {
        id: booking._id,
        room: booking.roomId.name,
        user: req.user.username
      },
      timestamp: new Date()
    });
    // ==================== SLUT SOCKET.IO ====================

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Avboka/ta bort bokning
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bokningen hittades inte'
      });
    }

    // Kontrollera behörighet
    if (req.user.role !== 'admin' && booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Du har inte behörighet att avboka denna bokning'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    // ==================== SOCKET.IO NOTISER ====================
    const io = req.app.get('io');

    // Allmän notis
    io.emit('booking-deleted', {
      type: 'booking_deleted',
      message: 'Bokning raderad',
      bookingId: req.params.id,
      timestamp: new Date()
    });

    // Notis till admin
    io.to('admin-channel').emit('booking-deleted', {
      type: 'booking_deleted',
      message: 'Bokning raderad',
      bookingId: req.params.id,
      timestamp: new Date()
    });
    // ==================== SLUT SOCKET.IO ====================

    res.status(200).json({
      success: true,
      message: 'Bokningen har avbokats'
    });
  } catch (error) {
    next(error);
  }
};
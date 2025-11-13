const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Anslut till databasen
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Ansluten till MongoDB för seeding');

    // Kolla om admin redan finns
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin-användare finns redan:', existingAdmin.username);
      process.exit(0);
    }

    // Skapa admin-användare
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@bookingplatform.com',
      password: 'admin123', // Kommer hashas automatiskt
      role: 'admin'
    });

    console.log('🎉 Admin-användare skapad!');
    console.log('👤 Användarnamn:', adminUser.username);
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Lösenord: admin123');
    console.log('👑 Roll:', adminUser.role);
    console.log('⚠️  OBS: Byt lösenord i produktion!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
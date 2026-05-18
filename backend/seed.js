// backend/seed.js
// Database seeding script - Creates sample data for development/testing

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Registration = require('./src/models/Registration');

// Environment check - prevent running in production
const environment = process.env.NODE_ENV || 'development';

if (environment === 'production') {
  console.error('\n❌ ERROR: Seeding is NOT allowed in production environment!');
  console.error('   This script will delete all data in your database.');
  console.error('   Set NODE_ENV to "development" or "test" to run the seed script.\n');
  process.exit(1);
}

console.log(`\n🔧 Running in ${environment.toUpperCase()} mode\n`);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data (optional)
const clearDatabase = async () => {
  console.log('\n🗑️  Clearing existing data...');
  await User.deleteMany({});
  await Event.deleteMany({});
  await Registration.deleteMany({});
  console.log('✅ Database cleared');
};

// Create sample users
const createUsers = async () => {
  console.log('\n👥 Creating users...');
  
  const users = [
    {
      email: 'admin@gdgsc.com',
      password: await bcrypt.hash('admin123', 10),
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      college: 'USAR',
      graduationYear: 2025,
      course: 'B.Tech',
      enrollmentNumber: 'ADMIN001',
      phoneNumber: '9876543210',
      branch: 'Computer Science',
      exp: 1000,
      level: 5,
      rank: 'ADVANCED',
      isProfileComplete: true,
    },
    {
      email: 'user1@example.com',
      password: await bcrypt.hash('password123', 10),
      username: 'gamer_one',
      name: 'John Doe',
      role: 'user',
      college: 'USAR',
      graduationYear: 2026,
      course: 'B.Tech',
      enrollmentNumber: 'USER001',
      phoneNumber: '9876543211',
      branch: 'Computer Science',
      exp: 500,
      level: 3,
      rank: 'APPRENTICE',
      isProfileComplete: true,
    },
    {
      email: 'user2@example.com',
      password: await bcrypt.hash('password123', 10),
      username: 'pro_gamer',
      name: 'Jane Smith',
      role: 'user',
      college: 'USAR',
      graduationYear: 2025,
      course: 'B.Tech',
      enrollmentNumber: 'USER002',
      phoneNumber: '9876543212',
      branch: 'Information Technology',
      exp: 1500,
      level: 7,
      rank: 'ADVANCED',
      isProfileComplete: true,
    },
    {
      email: 'user3@example.com',
      password: await bcrypt.hash('password123', 10),
      username: 'noob_player',
      name: 'Bob Johnson',
      role: 'user',
      college: 'USAR',
      graduationYear: 2027,
      course: 'B.Tech',
      enrollmentNumber: 'USER003',
      phoneNumber: '9876543213',
      branch: 'Computer Science',
      exp: 100,
      level: 1,
      rank: 'BEGINNER',
      isProfileComplete: true,
    },
    {
      email: 'user4@example.com',
      password: await bcrypt.hash('password123', 10),
      username: 'elite_dev',
      name: 'Alice Williams',
      role: 'user',
      college: 'USAR',
      graduationYear: 2024,
      course: 'M.Tech',
      enrollmentNumber: 'USER004',
      phoneNumber: '9876543214',
      branch: 'Computer Science',
      exp: 3000,
      level: 15,
      rank: 'MASTER',
      isProfileComplete: true,
    },
  ];

  const createdUsers = await User.insertMany(users);
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
};

// Create sample events
const createEvents = async () => {
  console.log('\n📋 Creating events...');
  
  const now = new Date();
  const events = [
    {
      eventId: 'gameathon-2024',
      name: 'Gameathon 2024',
      description: 'Annual 48-hour game development marathon. Build amazing games with your team!',
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      eventEndDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
      registrationStartDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      registrationEndDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      location: 'USAR Room No: A209',
      pointsAwarded: 200,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420',
    },
    {
      eventId: 'unity-workshop',
      name: 'Unity Game Development Workshop',
      description: 'Learn the basics of Unity game engine and create your first 2D platformer game.',
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      eventEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
      registrationStartDate: new Date(now.getTime()),
      registrationEndDate: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000),
      location: 'USAR Computer Lab',
      pointsAwarded: 100,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc',
    },
    {
      eventId: 'game-design-talk',
      name: 'Game Design Masterclass',
      description: 'Industry expert talk on game design principles, mechanics, and player psychology.',
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      registrationStartDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      location: 'USAR Auditorium',
      pointsAwarded: 50,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f',
    },
    {
      eventId: 'past-event',
      name: 'Game Jam 2023 (Past Event)',
      description: 'Previous game jam event - create games in 48 hours!',
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      eventEndDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      registrationStartDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
      location: 'USAR Campus',
      pointsAwarded: 150,
      isActive: false,
    },
    {
      eventId: 'ongoing-tournament',
      name: 'Gaming Tournament (Ongoing)',
      description: 'Competitive gaming tournament happening now!',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Started yesterday
      eventEndDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Ends tomorrow
      registrationStartDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      location: 'USAR Gaming Arena',
      pointsAwarded: 300,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
    },
  ];

  const createdEvents = await Event.insertMany(events);
  console.log(`✅ Created ${createdEvents.length} events`);
  return createdEvents;
};

// Create sample registrations
const createRegistrations = async (users, events) => {
  console.log('\n📝 Creating registrations...');
  
  const registrations = [
    {
      user: users[1]._id, // John Doe
      event: events[0]._id, // Gameathon
      status: 'confirmed',
    },
    {
      user: users[2]._id, // Jane Smith
      event: events[0]._id, // Gameathon
      status: 'confirmed',
    },
    {
      user: users[1]._id, // John Doe
      event: events[1]._id, // Unity Workshop
      status: 'confirmed',
    },
    {
      user: users[3]._id, // Bob Johnson
      event: events[2]._id, // Game Design Talk
      status: 'pending',
    },
    {
      user: users[4]._id, // Alice Williams
      event: events[3]._id, // Past Event
      status: 'confirmed',
    },
  ];

  const createdRegistrations = await Registration.insertMany(registrations);
  console.log(`✅ Created ${createdRegistrations.length} registrations`);
  return createdRegistrations;
};


// Main seeding function
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('\n🌱 Starting database seeding...\n');
    console.log('='.repeat(50));
    
    // Clear existing data (comment out if you want to keep existing data)
    await clearDatabase();
    
    // Create data
    const users = await createUsers();
    const events = await createEvents();
    const registrations = await createRegistrations(users, events);
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Registrations: ${registrations.length}`);
    console.log('\n🔑 Test Credentials:');
    console.log('   Admin: admin@gdgsc.com / admin123');
    console.log('   User:  user1@example.com / password123');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();

// backend/seedRecruitmentEvent.js
//
// Idempotent seed script — creates the "GDGSC Recruitments 2026" Event record
// (with slug "gdgsc-recruitments-2026") in the target database if it doesn't
// already exist. If the event exists but lacks the slug, adds it.
//
// Usage:
//   NODE_ENV=development node seedRecruitmentEvent.js   # → writes to dev DB
//   NODE_ENV=production  node seedRecruitmentEvent.js   # → writes to test DB
//
// The slug is the stable identifier the backend uses to serve the event config
// to the frontend — no ObjectId needs to be copied into .env files.

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');

const { getMongoConfig, getMongoUri, getEnvironment } = require('./src/config/db');

const env = getEnvironment();
let mongoConfig;
let mongoUri;
try {
  mongoConfig = getMongoConfig();
  mongoUri = mongoConfig.uri;
} catch (err) {
  console.error('ERROR resolving MongoDB URI:', err.message);
  process.exit(1);
}

const SLUG = 'gdgsc-recruitments-2026';
const EVENT_NAME = 'GDGSC Recruitments 2026';

// Minimal Event schema (only the fields we need for seeding)
const EventSchema = new mongoose.Schema(
  {
    eventId:  String,
    slug:     { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    name:     String,
    description: String,
    date:     Date,
    eventEndDate:          Date,
    registrationStartDate: Date,
    registrationEndDate:   Date,
    location:     String,
    pointsAwarded: { type: Number, default: 1 },
    isActive:     { type: Boolean, default: true },
    imageUrl:     String,
    customRegistrationFields: { type: Array, default: [] },
  },
  { timestamps: true }
);

async function seed() {
  console.log(`Connecting to MongoDB (${env} → ${mongoConfig.databaseName})…`);
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  const Event = mongoose.model('Event', EventSchema);

  // 1. Check if event already exists by slug
  let existing = await Event.findOne({ slug: SLUG });

  if (existing) {
    console.log('\n✅ Event already exists with the correct slug — no changes made.');
    console.log(`   _id      : ${existing._id}`);
    console.log(`   eventId  : ${existing.eventId}`);
    console.log(`   slug     : ${existing.slug}`);
    console.log(`   isActive : ${existing.isActive}`);
    await mongoose.disconnect();
    return;
  }

  // 2. Check if event exists by name but without slug (backfill case)
  existing = await Event.findOne({ name: EVENT_NAME, slug: { $exists: false } });
  if (!existing) {
    existing = await Event.findOne({ name: EVENT_NAME });
  }

  if (existing) {
    // Backfill: add slug to existing event
    existing.slug = SLUG;
    await existing.save();
    console.log('\n✅ Existing event updated with slug.');
    console.log(`   _id      : ${existing._id}`);
    console.log(`   eventId  : ${existing.eventId}`);
    console.log(`   slug     : ${existing.slug}`);
    console.log(`   isActive : ${existing.isActive}`);
    console.log('\n👉 The frontend will now discover this event via GET /api/recruitments/config');
    await mongoose.disconnect();
    return;
  }

  // 3. Create new event
  // Find the highest existing EVTxxx id to auto-increment
  const events = await Event.find({ eventId: /^EVT\d+$/ }).select('eventId');
  const maxNum = events.reduce((max, e) => {
    const n = parseInt((e.eventId || '').replace('EVT', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const newEventId = `EVT${String(maxNum + 1).padStart(3, '0')}`;

  const created = await Event.create({
    eventId: newEventId,
    slug: SLUG,
    name: EVENT_NAME,
    description:
      'Apply to become a part of GDGSC! Join one of our teams and help build, design, grow, and innovate. Recruitment 2026 is your chance to be part of something big.',
    date: new Date('2026-09-15T10:00:00.000Z'),
    eventEndDate: new Date('2026-09-30T18:00:00.000Z'),
    registrationStartDate: new Date('2026-09-13T00:00:00.000Z'),
    registrationEndDate: new Date('2026-09-28T23:59:59.000Z'),
    location: 'Online / USAR Campus',
    pointsAwarded: 1,
    isActive: true,
    imageUrl: '',
    customRegistrationFields: [],
  });

  console.log('\n✅ GDGSC Recruitments 2026 event created successfully!');
  console.log(`   _id      : ${created._id}`);
  console.log(`   eventId  : ${created.eventId}`);
  console.log(`   slug     : ${created.slug}`);
  console.log('\n👉 The frontend will now discover this event via GET /api/recruitments/config');
  console.log('   No REACT_APP_RECRUITMENT_EVENT_ID is needed.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});

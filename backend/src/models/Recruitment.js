// backend/src/models/Recruitment.js

const mongoose = require('mongoose');

const ALLOWED_TEAMS = [
  'Unreal (Game Development)',
  'Blender (Game Design)',
  'Prototype (Graphic Design, UI/UX)',
  'Scratch (Web Development)',
  'Overwatch (Event Management)',
  'Outreach (PR and Media)',
  'Catalyst (Research & Development)',
  'Theft (sponsorship)',
];

const RecruitmentSchema = new mongoose.Schema(
  {
    // Auth-derived — never trust client-provided userId
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Links to the specific recruitment event (e.g. "GDGSC Recruitments 2026")
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },

    // --- Snapshotted form fields (profile changes after submit do NOT affect these) ---

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    enrollmentNumber: {
      type: String,
      required: [true, 'Enrollment Number is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact Number is required'],
      trim: true,
    },

    uss: {
      type: String,
      required: [true, 'USS is required'],
      enum: {
        values: ['USAR', 'USDI', 'USAP', 'USMC'],
        message: 'USS must be one of: USAR, USDI, USAP, USMC',
      },
    },
    year: {
      type: String,
      required: [true, 'Year is required'],
      enum: {
        values: ['2026-2030', '2025-2029', '2024-2028', '2023-2027', '2022-2026', 'Other'],
        message: 'Year must be one of the provided batch options',
      },
    },
    // Only set when year === 'Other'
    yearOther: {
      type: String,
      trim: true,
      default: '',
    },

    // Multi-select: applicant may apply to one or more teams
    teams: {
      type: [String],
      required: [true, 'At least one team must be selected'],
      validate: [
        {
          // Must have at least one entry
          validator: (arr) => Array.isArray(arr) && arr.length >= 1,
          message: 'At least one team must be selected',
        },
        {
          // Every entry must be a valid team name
          validator: (arr) =>
            Array.isArray(arr) && arr.every((t) => ALLOWED_TEAMS.includes(t)),
          message: `Invalid team selection. Each team must be one of: ${ALLOWED_TEAMS.join(', ')}`,
        },
      ],
    },

    motivation: {
      type: String,
      required: [true, 'Motivation is required'],
      trim: true,
    },
    experience: {
      type: String,
      required: [true, 'Experience is required'],
      trim: true,
    },
    // Optional — no corresponding User field, user fills manually
    portfolioOrSocials: {
      type: String,
      trim: true,
      default: '',
    },

    // --- Admin-managed status ---
    status: {
      type: String,
      enum: {
        values: ['pending', 'shortlisted', 'rejected', 'selected'],
        message: 'Status must be one of: pending, shortlisted, rejected, selected',
      },
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One application per user per recruitment event
RecruitmentSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Recruitment', RecruitmentSchema);
module.exports.ALLOWED_TEAMS = ALLOWED_TEAMS;

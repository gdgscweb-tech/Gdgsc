// backend/src/controllers/recruitmentController.js

const asyncHandler = require('express-async-handler');
const Recruitment = require('../models/Recruitment');
const { ALLOWED_TEAMS } = require('../models/Recruitment');
const Event = require('../models/Event');

// Stable slug used to identify the GDGSC Recruitments 2026 event in any environment.
// The seed script writes this slug into MongoDB; the frontend fetches it via /config.
const RECRUITMENT_SLUG = 'gdgsc-recruitments-2026';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a legacy team value (string or array) into a clean array.
 * Handles:
 *   - undefined / null / ''  → []
 *   - 'Unreal (Game Dev)'    → ['Unreal (Game Dev)']
 *   - ['Unreal', 'Scratch']  → ['Unreal', 'Scratch']
 */
const normaliseTeams = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

/** Build a text-search filter from a ?search= query param */
const buildSearchFilter = (search) => {
  if (!search || !search.trim()) return {};
  const regex = new RegExp(search.trim(), 'i');
  return {
    $or: [
      { fullName: regex },
      { email: regex },
      { enrollmentNumber: regex },
      { teams: regex },   // matches any element inside the teams array
    ],
  };
};

/** Escape a CSV cell (wrap in quotes if it contains comma, quote, or newline) */
const csvCell = (value) => {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const CSV_HEADERS = [
  'Email',
  'Full Name',
  'Enrollment Number',
  'Contact Number',
  'USS',
  'Year',
  'Team(s)',
  'Why do you want to join GDGSC',
  'Prior Experience / Skills',
  'Portfolio / GitHub / Socials',
  'Status',
  'Submitted At',
];

// ---------------------------------------------------------------------------
// @desc    Get the active recruitment event configuration
// @route   GET /api/recruitments/config
// @access  Public
// ---------------------------------------------------------------------------
exports.getRecruitmentConfig = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ slug: RECRUITMENT_SLUG }).select(
    '_id eventId slug name description date eventEndDate registrationStartDate registrationEndDate location isActive'
  );

  if (!event) {
    res.status(404);
    throw new Error('Recruitment event not found. Run the seed script to create it.');
  }

  res.status(200).json({
    eventId: event._id,       // ObjectId used for Recruitment documents
    eventCode: event.eventId, // Human-readable EVTxxx code
    slug: event.slug,
    name: event.name,
    description: event.description,
    date: event.date,
    eventEndDate: event.eventEndDate,
    registrationStartDate: event.registrationStartDate,
    registrationEndDate: event.registrationEndDate,
    location: event.location,
    isActive: event.isActive,
  });
});

// ---------------------------------------------------------------------------
// @desc    Get current user's recruitment application
// @route   GET /api/recruitments/me
// @access  Private
// ---------------------------------------------------------------------------
exports.getMyApplication = asyncHandler(async (req, res) => {
  const application = await Recruitment.findOne({ userId: req.user.id });

  if (!application) {
    return res.status(404).json({ message: 'No application found.' });
  }

  res.status(200).json(application);
});

// ---------------------------------------------------------------------------
// @desc    Submit a new recruitment application
// @route   POST /api/recruitments
// @access  Private
// ---------------------------------------------------------------------------
exports.submitApplication = asyncHandler(async (req, res) => {
  const {
    eventId,
    email,
    fullName,
    enrollmentNumber,
    contactNumber,
    uss,
    year,
    yearOther,
    teams,
    motivation,
    experience,
    portfolioOrSocials,
  } = req.body;

  // Validate all required fields explicitly before Mongoose so we return a
  // human-readable 400 rather than a 500 on ValidationError
  const missing = [];
  if (!email) missing.push('email');
  if (!fullName) missing.push('fullName');
  if (!enrollmentNumber) missing.push('enrollmentNumber');
  if (!contactNumber) missing.push('contactNumber');
  if (!uss) missing.push('uss');
  if (!year) missing.push('year');
  if (!motivation) missing.push('motivation');
  if (!experience) missing.push('experience');
  if (!eventId) missing.push('eventId');

  if (missing.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate teams explicitly for a clear error message
  const teamsArr = normaliseTeams(teams);
  if (teamsArr.length === 0) {
    res.status(400);
    throw new Error('Missing required fields: teams');
  }
  const invalidTeams = teamsArr.filter((t) => !ALLOWED_TEAMS.includes(t));
  if (invalidTeams.length > 0) {
    res.status(400);
    throw new Error(`Invalid team selection: ${invalidTeams.join(', ')}`);
  }

  // Verify the event exists
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Recruitment event not found.');
  }

  try {
    const application = await Recruitment.create({
      // userId is ALWAYS from auth middleware — never trust client body
      userId: req.user.id,
      eventId,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      enrollmentNumber: enrollmentNumber.trim(),
      contactNumber: contactNumber.trim(),
      uss,
      year,
      yearOther: yearOther || '',
      teams: teamsArr,
      motivation: motivation.trim(),
      experience: experience.trim(),
      portfolioOrSocials: portfolioOrSocials ? portfolioOrSocials.trim() : '',
    });

    res.status(201).json({
      message: 'Application submitted successfully!',
      application,
    });
  } catch (error) {
    // Duplicate key error (unique index violation)
    if (error.code === 11000) {
      res.status(400);
      throw new Error('You have already submitted an application for this recruitment drive.');
    }
    // Mongoose validation errors (enum, custom validator, etc.)
    if (error.name === 'ValidationError') {
      res.status(400);
      throw new Error(error.message);
    }
    throw error;
  }
});

// ---------------------------------------------------------------------------
// @desc    Update current user's pending application
// @route   PUT /api/recruitments/me
// @access  Private
// ---------------------------------------------------------------------------
exports.updateMyApplication = asyncHandler(async (req, res) => {
  const application = await Recruitment.findOne({ userId: req.user.id });

  if (!application) {
    res.status(404);
    throw new Error('No application found to update.');
  }

  if (application.status !== 'pending') {
    res.status(403);
    throw new Error('Your application is no longer pending and cannot be edited.');
  }

  const {
    email,
    fullName,
    enrollmentNumber,
    contactNumber,
    uss,
    year,
    yearOther,
    teams,
    motivation,
    experience,
    portfolioOrSocials,
  } = req.body;

  // Validate teams if provided
  if (teams !== undefined) {
    const teamsArr = normaliseTeams(teams);
    if (teamsArr.length === 0) {
      res.status(400);
      throw new Error('At least one team must be selected');
    }
    const invalidTeams = teamsArr.filter((t) => !ALLOWED_TEAMS.includes(t));
    if (invalidTeams.length > 0) {
      res.status(400);
      throw new Error(`Invalid team selection: ${invalidTeams.join(', ')}`);
    }
    application.teams = teamsArr;
  }

  // Allowed updatable fields — userId and eventId are intentionally excluded
  if (email) application.email = email.trim().toLowerCase();
  if (fullName) application.fullName = fullName.trim();
  if (enrollmentNumber) application.enrollmentNumber = enrollmentNumber.trim();
  if (contactNumber) application.contactNumber = contactNumber.trim();
  if (uss) application.uss = uss;
  if (year) application.year = year;
  if (yearOther !== undefined) application.yearOther = yearOther || '';
  if (motivation) application.motivation = motivation.trim();
  if (experience) application.experience = experience.trim();
  if (portfolioOrSocials !== undefined) {
    application.portfolioOrSocials = portfolioOrSocials ? portfolioOrSocials.trim() : '';
  }

  try {
    await application.save();
    res.status(200).json({
      message: 'Application updated successfully.',
      application,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400);
      throw new Error(error.message);
    }
    throw error;
  }
});

// ---------------------------------------------------------------------------
// @desc    Get all applications (Admin)
// @route   GET /api/recruitments?search=&status=&eventId=
// @access  Private/Admin
// ---------------------------------------------------------------------------
exports.getAllApplications = asyncHandler(async (req, res) => {
  const { search, status, eventId } = req.query;

  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (eventId) {
    filter.eventId = eventId;
  }

  const searchFilter = buildSearchFilter(search);
  const combinedFilter = Object.keys(searchFilter).length > 0
    ? { $and: [filter, searchFilter] }
    : filter;

  const applications = await Recruitment.find(combinedFilter)
    .sort({ createdAt: -1 });

  res.status(200).json(applications);
});

// ---------------------------------------------------------------------------
// @desc    Update an application's status (Admin)
// @route   PUT /api/recruitments/:id/status
// @access  Private/Admin
// ---------------------------------------------------------------------------
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['pending', 'shortlisted', 'rejected', 'selected'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const application = await Recruitment.findById(req.params.id);
  if (!application) {
    res.status(404);
    throw new Error('Application not found.');
  }

  application.status = status;
  await application.save();

  res.status(200).json({
    message: `Application status updated to "${status}".`,
    application,
  });
});

// ---------------------------------------------------------------------------
// @desc    Export all applications as CSV (Admin)
// @route   GET /api/recruitments/export/csv
// @access  Private/Admin
// ---------------------------------------------------------------------------
exports.exportCsv = asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  const filter = eventId ? { eventId } : {};

  const applications = await Recruitment.find(filter).sort({ createdAt: 1 });

  const rows = applications.map((a) =>
    [
      csvCell(a.email),
      csvCell(a.fullName),
      csvCell(a.enrollmentNumber),
      csvCell(a.contactNumber),
      csvCell(a.uss),
      csvCell(a.year === 'Other' ? a.yearOther || 'Other' : a.year),
      // teams array → comma-separated string, quoted if needed
      csvCell(Array.isArray(a.teams) ? a.teams.join(', ') : (a.teams || '')),
      csvCell(a.motivation),
      csvCell(a.experience),
      csvCell(a.portfolioOrSocials),
      csvCell(a.status),
      csvCell(a.createdAt ? new Date(a.createdAt).toISOString() : ''),
    ].join(',')
  );

  const csvContent = [CSV_HEADERS.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="gdgsc-recruitments-2026.csv"'
  );
  res.status(200).send(csvContent);
});

const Event = require('../models/Event');
const Registration = require('../models/Registration'); // Import Registration model
const User = require('../models/User'); // Import User model
const asyncHandler = require('express-async-handler'); // For handling async errors
const fs = require('fs').promises;
const axios = require('axios');
const { ApiError } = require('../utils/apiResponse');

const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    return value === 'true';
};

const normalizeDriveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url || '';
    const trimmed = url.trim();
    const match = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/i);
    if (match) {
        return `/api/assets/drive/${match[1]}`;
    }
    return trimmed;
};

const parseCustomRegistrationFields = (value, fallback = []) => {
    if (value === undefined) return fallback;

    let fields = value;
    if (typeof value === 'string') {
        try {
            fields = JSON.parse(value);
        } catch (error) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'customRegistrationFields must be valid JSON.');
        }
    }

    if (!Array.isArray(fields)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'customRegistrationFields must be an array.');
    }

    return fields
        .filter((field) => field && typeof field === 'object')
        .map((field) => ({
            fieldName: field.fieldName ? String(field.fieldName).trim() : undefined,
            fieldLabel: field.fieldLabel ? String(field.fieldLabel).trim() : undefined,
            fieldType: field.fieldType ? String(field.fieldType).trim() : undefined,
            required: typeof field.required === 'boolean' ? field.required : Boolean(field.required),
            options: Array.isArray(field.options) ? field.options.map((option) => String(option)) : [],
            placeholder: field.placeholder ? String(field.placeholder) : undefined,
            validation: field.validation && typeof field.validation === 'object' ? field.validation : undefined,
        }))
        .filter((field) => field.fieldName || field.fieldLabel || field.fieldType || field.options.length);
};

const validateEventFields = (values) => {
    const { name, description, date, eventEndDate, registrationStartDate, registrationEndDate, pointsAwarded } = values;

    if (!name || String(name).trim() === '') throw new ApiError(400, 'VALIDATION_ERROR', 'Event name is required.');
    if (String(name).trim().length < 3) throw new ApiError(400, 'VALIDATION_ERROR', 'Event name must be at least 3 characters.');
    if (!description || String(description).trim().length < 10) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Description is required and must be at least 10 characters.');
    }
    if (!date || !eventEndDate || !registrationStartDate || !registrationEndDate) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'All date fields (start, end, registration start, registration end) are required.');
    }

    const parsedDates = [date, eventEndDate, registrationStartDate, registrationEndDate].map((value) => new Date(value));
    if (parsedDates.some((value) => Number.isNaN(value.getTime()))) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'One or more provided dates are invalid.');
    }
    const [eventDate, eventEnd, regStart, regEnd] = parsedDates;
    if (eventEnd <= eventDate) throw new ApiError(400, 'VALIDATION_ERROR', 'Event end date must be after event start date.');
    if (regEnd <= regStart) throw new ApiError(400, 'VALIDATION_ERROR', 'Registration end date must be after registration start date.');
    if (regEnd > eventDate) throw new ApiError(400, 'VALIDATION_ERROR', 'Registration must end on or before the event start date.');

    const parsedPoints = Number(pointsAwarded);
    if (!Number.isFinite(parsedPoints) || parsedPoints < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'pointsAwarded must be a number >= 1.');
    }

    return { eventDate, eventEnd, regStart, regEnd, parsedPoints };
};

// Helper function to convert image to base64
const imageToBase64 = async (filePath) => {
    try {
        const imageBuffer = await fs.readFile(filePath);
        return imageBuffer.toString('base64');
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
};

// Helper function to download image from URL and convert to base64
const urlToBase64 = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error('Error downloading image from URL:', error);
        return null;
    }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = asyncHandler(async (req, res) => {
  console.log("\n🟦 CREATE EVENT HIT");
  console.log("➡️ req.headers.content-type:", req.headers["content-type"]);
  console.log("➡️ req.body (raw):", req.body);
  console.log("➡️ req.file (raw):", req.file);

  // Extract raw values (they will be strings coming from FormData)
  const {
    eventId,
    name,
    description,
    date,
    eventEndDate,
    registrationStartDate,
    registrationEndDate,
    location,
    pointsAwarded,
    isActive,
    imageUrl: directImageUrl,
    customRegistrationFields,
  } = req.body;

  const { eventDate, eventEnd, regStart, regEnd, parsedPoints } = validateEventFields({
    name, description, date, eventEndDate, registrationStartDate, registrationEndDate, pointsAwarded,
  });
  const isActiveBool = parseBoolean(isActive);

  // --------- Parse & sanitize customRegistrationFields safely ----------
  const parsedCustomFields = parseCustomRegistrationFields(customRegistrationFields);

  console.log("🟪 Parsed custom fields:", parsedCustomFields);

  const imageUrl = req.file ? req.file.path : normalizeDriveImageUrl(directImageUrl);
  const imageBackup = '';
  const imageMetadata = {};

  // --------- Create event ----------
  const eventPayload = {
    eventId: eventId && eventId.trim() !== "" ? eventId.trim() : undefined,
    name: String(name).trim(),
    description: String(description).trim(),
    date: eventDate,
    eventEndDate: eventEnd,
    registrationStartDate: regStart,
    registrationEndDate: regEnd,
    location: String(location).trim(),
    pointsAwarded: parsedPoints,
    isActive: isActiveBool,
    imageUrl,
    imageBackup,
    imageMetadata,
    customRegistrationFields: parsedCustomFields,
  };

  console.log("🟫 Event payload to save:", {
    ...eventPayload,
    // don't log huge base64 in console; show length if present
    imageBackupLength: imageBackup ? imageBackup.length : 0,
  });

  const event = await Event.create(eventPayload);

  console.log("🟧 Event created:", { id: event._id, name: event.name, imageUrl: event.imageUrl || "(none)" });

  res.status(201).json(event);
});


// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = asyncHandler(async (req, res) => {
    // Optionally filter for active events for public view
    // const events = await Event.find({ isActive: true }).sort({ date: 1 });
    const events = await Event.find().sort({ date: 1 }); // Or get all, let frontend filter
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.status(200).json(events);
});

// @desc    Get a single event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.status(200).json(event);
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = asyncHandler(async (req, res) => {
    const { eventId, name, description, date, eventEndDate, registrationStartDate, registrationEndDate, location, pointsAwarded, isActive, imageUrl: directImageUrl, customRegistrationFields } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    const nextValues = {
        name: name !== undefined ? name : event.name,
        description: description !== undefined ? description : event.description,
        date: date !== undefined ? date : event.date,
        eventEndDate: eventEndDate !== undefined ? eventEndDate : event.eventEndDate,
        registrationStartDate: registrationStartDate !== undefined ? registrationStartDate : event.registrationStartDate,
        registrationEndDate: registrationEndDate !== undefined ? registrationEndDate : event.registrationEndDate,
        pointsAwarded: pointsAwarded !== undefined ? pointsAwarded : event.pointsAwarded,
    };
    const { eventDate, eventEnd, regStart, regEnd, parsedPoints } = validateEventFields(nextValues);

    // Store old pointsAwarded value before updating for EXP adjustment
    const oldPointsAwarded = event.pointsAwarded;

    // Get image URL from uploaded file (if provided), or direct URL if provided, otherwise keep existing
    let imageUrl = event.imageUrl;
    if (req.file) {
        imageUrl = req.file.path;
    } else if (directImageUrl !== undefined) {
        imageUrl = normalizeDriveImageUrl(directImageUrl);
    }

    // Update event fields
    event.eventId = eventId !== undefined ? eventId : event.eventId;
    event.name = name !== undefined ? name : event.name;
    event.description = description !== undefined ? description : event.description;
    event.date = eventDate;
    event.eventEndDate = eventEnd;
    event.registrationStartDate = regStart;
    event.registrationEndDate = regEnd;
    event.location = location !== undefined ? location : event.location;
    // Ensure pointsAwarded is updated
    event.pointsAwarded = parsedPoints;
    if (typeof isActive !== 'undefined') {
        event.isActive = parseBoolean(isActive);
    }
    event.imageUrl = imageUrl;
    event.customRegistrationFields = parseCustomRegistrationFields(customRegistrationFields, event.customRegistrationFields);

    const updatedEvent = await event.save();

    // NEW LOGIC: Adjust user EXP if pointsAwarded actually changed
    if (updatedEvent.pointsAwarded !== oldPointsAwarded) {
        const pointsDifference = updatedEvent.pointsAwarded - oldPointsAwarded;
        console.log(`Event "${updatedEvent.name}" points changed from ${oldPointsAwarded} to ${updatedEvent.pointsAwarded}. Difference: ${pointsDifference}`);

        // Find all users who registered for this event
        const registrations = await Registration.find({ event: updatedEvent._id });

        for (const reg of registrations) {
            const user = await User.findById(reg.user);
            if (user) {
                // Add the difference (can be positive or negative)
                // Use addExpAndLevelUp method to correctly handle level/rank updates
                // If points are decreased, pass a negative value to addExpAndLevelUp
                // The method should handle ensuring EXP doesn't go below 0
                await user.addExpAndLevelUp(pointsDifference);
                console.log(`User ${user.username} EXP adjusted by ${pointsDifference} for event change.`);
            }
        }
    }

    res.status(200).json(updatedEvent);
});


// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // NEW LOGIC: Adjust user EXP and delete registrations

    // 1. Find all registrations for this event
    const registrationsToDelete = await Registration.find({ event: event._id });

    // 2. For each registration, deduct the points from the user
    for (const reg of registrationsToDelete) {
        const user = await User.findById(reg.user);
        if (user) {
            // Deduct points. Use addExpAndLevelUp with a negative value.
            // This method should handle ensuring EXP doesn't go below 0 and recalculating level/rank.
            await user.addExpAndLevelUp(-event.pointsAwarded);
            console.log(`Deducted ${event.pointsAwarded} EXP from user ${user.username} due to event deletion.`);
        }
    }

    // 3. Delete all registrations associated with this event
    await Registration.deleteMany({ event: event._id });
    console.log(`Deleted all registrations for event: ${event.name}`);

    // END NEW LOGIC

    // 4. Finally, delete the event itself
    await event.deleteOne();

    res.status(200).json({ message: 'Event and all associated registrations removed. User EXP adjusted.' });
});

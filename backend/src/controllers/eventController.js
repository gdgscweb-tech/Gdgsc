const Event = require('../models/Event');
const Registration = require('../models/Registration'); // Import Registration model
const User = require('../models/User'); // Import User model
const asyncHandler = require('express-async-handler'); // For handling async errors
const fs = require('fs').promises;
const axios = require('axios');

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
    customRegistrationFields,
  } = req.body;

  // --------- Basic field validation (clear messages) ----------
  if (!name || name.trim() === "") {
    res.status(400);
    throw new Error("Event name is required.");
  }

  if (!description || description.trim().length < 10) {
    res.status(400);
    throw new Error("Description is required and must be at least 10 characters.");
  }

  if (!date || !eventEndDate || !registrationStartDate || !registrationEndDate) {
    res.status(400);
    throw new Error("All date fields (start, end, registration start, registration end) are required.");
  }

  // Parse dates
  const eventDate = new Date(date);
  const eventEnd = new Date(eventEndDate);
  const regStart = new Date(registrationStartDate);
  const regEnd = new Date(registrationEndDate);

  if (isNaN(eventDate.getTime()) || isNaN(eventEnd.getTime()) || isNaN(regStart.getTime()) || isNaN(regEnd.getTime())) {
    res.status(400);
    throw new Error("One or more provided dates are invalid.");
  }

  if (eventEnd <= eventDate) {
    res.status(400);
    throw new Error("Event end date must be after event start date.");
  }

  if (regEnd <= regStart) {
    res.status(400);
    throw new Error("Registration end date must be after registration start date.");
  }

  if (regEnd > eventDate) {
    res.status(400);
    throw new Error("Registration must end on or before the event start date.");
  }

  // Parse pointsAwarded (should be a number and respect your schema min:1)
  const parsedPoints = Number(pointsAwarded);
  if (isNaN(parsedPoints) || parsedPoints < 1) {
    res.status(400);
    throw new Error("pointsAwarded must be a number >= 1.");
  }

  // Coerce boolean-ish isActive
  const isActiveBool = typeof isActive === "string" ? isActive === "true" : Boolean(isActive);

  // --------- Parse & sanitize customRegistrationFields safely ----------
  let parsedCustomFields = [];
  try {
    if (customRegistrationFields) {
      // If the client already sent JSON string, parse it; if it's an array (rare), keep it
      parsedCustomFields = typeof customRegistrationFields === "string"
        ? JSON.parse(customRegistrationFields)
        : customRegistrationFields;
    }
    if (!Array.isArray(parsedCustomFields)) {
      parsedCustomFields = [];
    }
  } catch (err) {
    console.warn("⚠️ Failed to parse customRegistrationFields, defaulting to []:", err.message);
    parsedCustomFields = [];
  }

  // Sanitize elements: keep only plain objects (don't allow weird types), optionally filter out completely empty objects
  parsedCustomFields = parsedCustomFields
    .filter(f => f && typeof f === "object")
    .map(f => ({
      fieldName: f.fieldName ? String(f.fieldName).trim() : undefined,
      fieldLabel: f.fieldLabel ? String(f.fieldLabel).trim() : undefined,
      fieldType: f.fieldType ? String(f.fieldType).trim() : undefined,
      required: typeof f.required === "boolean" ? f.required : Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map(opt => String(opt)) : [],
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
      validation: f.validation && typeof f.validation === "object" ? f.validation : undefined,
    }))
    // drop entries that are completely empty (optional)
    .filter(f => f.fieldName || f.fieldLabel || f.fieldType || (f.options && f.options.length));

  console.log("🟪 Parsed custom fields:", parsedCustomFields);

  // --------- Image handling (CloudinaryStorage sets secure_url / url) ----------
  let imageUrl = "";
  let imageBackup = "";
  let imageMetadata = {};

  if (req.file) {
    console.log("🟣 req.file object from multer/cloudinary:", req.file);

    // Cloudinary storage commonly provides secure_url and/or url
    const cloudUrl = req.file.secure_url || req.file.url || req.file.path || "";
    if (cloudUrl) {
      imageUrl = cloudUrl;
      try {
        imageBackup = await urlToBase64(cloudUrl);
      } catch (err) {
        console.warn("⚠️ Failed to create base64 backup from cloud URL:", err.message);
        imageBackup = "";
      }
    }

    imageMetadata = {
      originalName: req.file.originalname || "",
      mimeType: req.file.mimetype || "",
      size: req.file.size || 0,
      uploadedAt: new Date(),
    };
  } else {
    console.log("ℹ️ No file uploaded with request (req.file is undefined).");
  }

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

    res.status(200).json(event);
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = asyncHandler(async (req, res) => {
    const { eventId, name, description, date, eventEndDate, registrationStartDate, registrationEndDate, location, pointsAwarded, isActive, customRegistrationFields } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Store old pointsAwarded value before updating for EXP adjustment
    const oldPointsAwarded = event.pointsAwarded;

    // Get image URL from uploaded file (if provided), otherwise keep existing
    const imageUrl = req.file ? req.file.path : event.imageUrl;

    // If new image was uploaded, create backup
    if (req.file) {
        const imageBackup = await urlToBase64(req.file.path);
        event.imageBackup = imageBackup;
        event.imageMetadata = {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date(),
        };
    }

    // Update event fields
    event.eventId = eventId !== undefined ? eventId : event.eventId;
    event.name = name !== undefined ? name : event.name;
    event.description = description !== undefined ? description : event.description;
    event.date = date ? new Date(date) : event.date;
    event.eventEndDate = eventEndDate ? new Date(eventEndDate) : event.eventEndDate;
    event.registrationStartDate = registrationStartDate ? new Date(registrationStartDate) : event.registrationStartDate;
    event.registrationEndDate = registrationEndDate ? new Date(registrationEndDate) : event.registrationEndDate;
    event.location = location !== undefined ? location : event.location;
    // Ensure pointsAwarded is updated
    event.pointsAwarded = pointsAwarded !== undefined ? pointsAwarded : event.pointsAwarded;
    if (typeof isActive !== 'undefined') {
        event.isActive = isActive;
    }
    event.imageUrl = imageUrl;
    event.customRegistrationFields = customRegistrationFields !== undefined ? JSON.parse(customRegistrationFields) : event.customRegistrationFields;

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
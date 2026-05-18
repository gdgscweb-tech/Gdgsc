// backend/src/models/Event.js

const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    date: {
        type: Date,
        required: true,
    },
    eventEndDate: {
        type: Date,
        required: true,
    },
    registrationStartDate: {
        type: Date,
        required: true,
    },
    registrationEndDate: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    pointsAwarded: {
        type: Number,
        required: true,
        min: 1, // Events should award at least 1 point
    },
    isActive: { // To control if an event is visible/registrable
        type: Boolean,
        default: true,
    },
    imageUrl: {
        type: String, // Will store the Base64 string or URL
        default: '',  // Default to empty string if no image
    },
   customRegistrationFields: [{
    fieldName: { type: String, required: false },   
    fieldLabel: { type: String, required: false },  
    fieldType: {
        type: String,
        enum: ['text','email','number','tel','textarea','select','checkbox','radio','date'],
        required: false,
    },
    required: { type: Boolean, default: false },
    options: [String],
    placeholder: String,
    validation: {
        min: Number,
        max: Number,
        minLength: Number,
        maxLength: Number,
        pattern: String,
    }
}]

}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// Pre-save hook to auto-generate eventId
EventSchema.pre('save', async function(next) {
    if (!this.eventId) {
        // Find the highest eventId number
        const lastEvent = await mongoose.model('Event').findOne({}, { eventId: 1 }).sort({ eventId: -1 });
        
        let nextNumber = 1;
        if (lastEvent && lastEvent.eventId) {
            const match = lastEvent.eventId.match(/EVT(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        
        // Generate new eventId with leading zeros (e.g., EVT001, EVT002)
        this.eventId = `EVT${String(nextNumber).padStart(3, '0')}`;
    }
    next();
});

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;